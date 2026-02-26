import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity
} from '../types';

// NSPA XML feed URL for published procurement opportunities
const NSPA_XML_URL = 'https://eportal.nspa.nato.int/Procurement/downloadopportunities.xml';

export class NspaHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'nato-nspa-harvester',
        name: 'NATO NSPA Harvester',
        version: '1.0.0',
        description: 'Fetches NATO Support and Procurement Agency (NSPA) opportunities from their public XML feed.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        const limit = params.limit || 20;
        console.log(`[NSPA] Fetching NATO procurement opportunities (limit ${limit})`);

        try {
            const response = await fetch(NSPA_XML_URL, {
                headers: { 'Accept': 'application/xml, text/xml' },
            });

            if (!response.ok) {
                console.error(`[NSPA] HTTP ${response.status}`);
                throw new Error(`NSPA returned ${response.status}`);
            }

            const xmlText = await response.text();

            // Quick XML parsing without external dependencies
            // Extract <opportunity> blocks from the XML
            const opportunities = this.parseXmlOpportunities(xmlText, limit);

            console.log(`[NSPA] Parsed ${opportunities.length} opportunities from XML`);

            return opportunities.map((opp, index) => ({
                id: opp.reference || `nspa-${Date.now()}-${index}`,
                source: 'NATO NSPA',
                harvestedAt: new Date(),
                rawPayload: opp,
            }));
        } catch (error: any) {
            console.error('[NSPA] Fetch failed:', error.message);
            return [];
        }
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        return {
            id: `nspa-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: p.title || p.subject || 'NATO NSPA Opportunity',
            description: p.description || p.scope || '',
            sourceUrl: p.url || `https://eportal.nspa.nato.int/Procurement/`,
            publishedAt: p.publishDate ? new Date(p.publishDate) : new Date(),
            deadlineAt: p.closingDate ? new Date(p.closingDate) : undefined,
            noticeType: p.type || 'FBO',
            valueExt: p.estimatedValue ? parseFloat(p.estimatedValue) : undefined,
            valueCurrency: 'EUR',
            country: 'nato',
            region: p.location || 'NATO',
            organisation: 'NATO Support and Procurement Agency (NSPA)',
            domain: this.inferDomain(p.title || '', p.description || ''),
            keywords: ['NATO', 'NSPA', 'defence', 'procurement', ...(p.categories || [])],
            workflowStage: 'New',
        };
    }

    async healthcheck(): Promise<HarvesterStatus> {
        try {
            const response = await fetch(NSPA_XML_URL, { method: 'HEAD' });
            if (response.ok) return 'healthy';
            return 'degraded';
        } catch {
            return 'offline';
        }
    }

    private parseXmlOpportunities(xml: string, limit: number): any[] {
        const results: any[] = [];

        // Match common XML patterns for procurement opportunities
        // NSPA uses various tags — try multiple patterns
        const patterns = [
            /<opportunity>([\s\S]*?)<\/opportunity>/gi,
            /<item>([\s\S]*?)<\/item>/gi,
            /<entry>([\s\S]*?)<\/entry>/gi,
            /<record>([\s\S]*?)<\/record>/gi,
        ];

        for (const pattern of patterns) {
            const matches = xml.matchAll(pattern);
            for (const match of matches) {
                if (results.length >= limit) break;
                const block = match[1];
                results.push({
                    reference: this.extractXmlTag(block, 'reference') || this.extractXmlTag(block, 'id'),
                    title: this.extractXmlTag(block, 'title') || this.extractXmlTag(block, 'subject'),
                    description: this.extractXmlTag(block, 'description') || this.extractXmlTag(block, 'scope'),
                    type: this.extractXmlTag(block, 'type') || this.extractXmlTag(block, 'category'),
                    publishDate: this.extractXmlTag(block, 'publishDate') || this.extractXmlTag(block, 'published'),
                    closingDate: this.extractXmlTag(block, 'closingDate') || this.extractXmlTag(block, 'deadline'),
                    estimatedValue: this.extractXmlTag(block, 'estimatedValue') || this.extractXmlTag(block, 'value'),
                    location: this.extractXmlTag(block, 'location') || this.extractXmlTag(block, 'place'),
                    url: this.extractXmlTag(block, 'url') || this.extractXmlTag(block, 'link'),
                });
            }
            if (results.length > 0) break; // Use first matching pattern
        }

        return results;
    }

    private extractXmlTag(xml: string, tag: string): string | undefined {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = xml.match(regex);
        if (!match) return undefined;
        // Strip CDATA wrappers
        return match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    }

    private inferDomain(title: string, description: string): Opportunity['domain'] {
        const text = `${title} ${description}`.toLowerCase();
        if (/\b(aircraft|air|aviation|helicopter|f-?35|fighter|awacs)\b/.test(text)) return 'air';
        if (/\b(naval|ship|maritime|submarine|vessel|frigate)\b/.test(text)) return 'sea';
        if (/\b(cyber|c4isr|information|electronic|software|communication)\b/.test(text)) return 'cyber';
        if (/\b(space|satellite|missile.defence)\b/.test(text)) return 'space';
        if (/\b(vehicle|ammunition|weapon|armour|infantry)\b/.test(text)) return 'land';
        return 'multi';
    }
}
