import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity
} from '../types';

const CF_API_BASE = 'https://www.contractsfinder.service.gov.uk/api/rest/2';

export class ContractsFinderHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'uk-contracts-finder-harvester',
        name: 'UK Contracts Finder Harvester',
        version: '1.0.0',
        description: 'Fetches UK defence procurement notices from the Contracts Finder API.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        const size = params.limit || 20;
        const publishedFrom = params.publishedFrom || this.getDefaultSinceDate();

        console.log(`[ContractsFinder] Fetching ${size} notices since ${publishedFrom}`);

        try {
            // Contracts Finder API v2 uses POST with JSON body
            const requestBody = {
                searchCriteria: {
                    keyword: 'defence OR military OR defense OR armed forces OR MoD',
                    publishedFrom,
                    size,
                    publishingStatus: 'published',
                }
            };

            const response = await fetch(
                `${CF_API_BASE}/search_notices/json`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[ContractsFinder] API error ${response.status}:`, errorText.substring(0, 500));
                throw new Error(`Contracts Finder API returned ${response.status}`);
            }

            const data = await response.json();

            // Debug: log actual response structure
            console.log(`[ContractsFinder] Response keys:`, Object.keys(data));
            if (data.releases) console.log(`[ContractsFinder] Has releases: ${data.releases.length}`);

            // CF v2 returns data under 'noticeList' key
            const notices = data.noticeList || data.releaseList || data.releases || [];
            // If it's a wrapper with embedded releases
            if (notices.length === 0 && data.hitCount > 0) {
                console.log(`[ContractsFinder] Warning: ${data.hitCount} hits but no notices extracted. Sample keys:`, JSON.stringify(Object.keys(data)).substring(0, 200));
            }

            console.log(`[ContractsFinder] Received ${notices.length} notices (hitCount: ${data.hitCount || 'unknown'})`);

            return notices.map((notice: any, index: number) => ({
                id: notice.releases?.[0]?.id || notice.uri || `cf-${Date.now()}-${index}`,
                source: 'UK Contracts Finder',
                harvestedAt: new Date(),
                rawPayload: notice,
            }));
        } catch (error: any) {
            console.error('[ContractsFinder] Fetch failed:', error.message);
            return [];
        }
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        // CF uses OCDS (Open Contracting Data Standard) format
        const release = p.releases?.[0] || p;
        const tender = release.tender || {};
        const buyer = release.buyer || {};

        const title = tender.title || release.title || p.title || 'Untitled UK Contract';
        const description = tender.description || release.description || p.description || '';

        // Map CF status to notice type
        const statusMap: Record<string, string> = {
            'planning': 'Prior Information Notice',
            'planned': 'Prior Information Notice',
            'active': 'Contract Notice',
            'closed': 'Contract Notice',
            'complete': 'Contract Award',
            'cancelled': 'Cancelled',
            'unsuccessful': 'Cancelled',
        };

        const value = tender.value?.amount || tender.minValue?.amount || undefined;
        const currency = tender.value?.currency || tender.minValue?.currency || 'GBP';

        const opp: Opportunity = {
            id: `cf-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: this.cleanText(title),
            description: this.cleanText(description).substring(0, 2000),
            sourceUrl: `https://www.contractsfinder.service.gov.uk/notice/${raw.id}`,
            publishedAt: release.date ? new Date(release.date) : new Date(),
            deadlineAt: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : undefined,
            noticeType: statusMap[tender.status?.toLowerCase()] || tender.status || 'Contract Notice',
            valueExt: value,
            valueCurrency: currency,
            country: 'gb',
            region: buyer.address?.region || buyer.address?.locality || 'United Kingdom',
            organisation: buyer.name || 'UK Government',
            domain: this.inferDomain(title, description),
            keywords: this.extractKeywords(tender),
            workflowStage: 'New',
        };

        return opp;
    }

    async healthcheck(): Promise<HarvesterStatus> {
        try {
            const response = await fetch(
                `${CF_API_BASE}/search_notices/json`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        searchCriteria: { keyword: 'defence', size: 1, publishingStatus: 'published' }
                    }),
                }
            );
            if (response.ok) return 'healthy';
            if (response.status === 429) return 'degraded';
            return 'degraded';
        } catch {
            return 'offline';
        }
    }

    private getDefaultSinceDate(): string {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        return d.toISOString();
    }

    private cleanText(text: string): string {
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private inferDomain(title: string, description: string): Opportunity['domain'] {
        const text = `${title} ${description}`.toLowerCase();
        if (/\b(aircraft|air force|raf|aviation|helicopter|drone|uav)\b/.test(text)) return 'air';
        if (/\b(naval|navy|ship|maritime|vessel|submarine|frigate)\b/.test(text)) return 'sea';
        if (/\b(cyber|information|electronic|software|digital|network)\b/.test(text)) return 'cyber';
        if (/\b(space|satellite|orbital)\b/.test(text)) return 'space';
        if (/\b(army|armoured|infantry|vehicle|tank|weapon)\b/.test(text)) return 'land';
        return 'multi';
    }

    private extractKeywords(tender: any): string[] {
        const tags: string[] = ['defence', 'UK', 'procurement'];
        if (tender.items) {
            tender.items.forEach((item: any) => {
                if (item.classification?.description) {
                    tags.push(item.classification.description);
                }
            });
        }
        return tags.slice(0, 10); // Limit to 10 keywords
    }
}
