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

            // Debug: log the first notice structure
            if (notices.length > 0) {
                console.log(`[ContractsFinder] First notice keys:`, JSON.stringify(Object.keys(notices[0])));
                // CF wraps in { score, item } — dig into item
                const first = notices[0].item || notices[0];
                console.log(`[ContractsFinder] First item keys:`, JSON.stringify(Object.keys(first)).substring(0, 500));
                // Log string fields for structure discovery
                for (const key of Object.keys(first)) {
                    const val = first[key];
                    if (typeof val === 'string' && val.length < 300) {
                        console.log(`[ContractsFinder] item.${key} =`, val);
                    } else if (typeof val === 'number') {
                        console.log(`[ContractsFinder] item.${key} =`, val);
                    } else if (typeof val === 'object' && val !== null) {
                        console.log(`[ContractsFinder] item.${key} keys:`, JSON.stringify(Object.keys(val)).substring(0, 200));
                    }
                }
            }

            // Unwrap { score, item } wrapper if present
            return notices.map((notice: any, index: number) => {
                const inner = notice.item || notice;
                return {
                    id: inner.id || inner.noticeIdentifier || inner.uri || `cf-${Date.now()}-${index}`,
                    source: 'UK Contracts Finder',
                    harvestedAt: new Date(),
                    rawPayload: inner,
                };
            });
        } catch (error: any) {
            console.error('[ContractsFinder] Fetch failed:', error.message);
            return [];
        }
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        // UK CF v2 uses a flat structure with direct field names
        const title = p.title || 'Untitled UK Contract';
        const description = p.description || p.cpvDescriptionExpanded || p.cpvDescription || '';

        // Determine the best value: awarded > high > low
        const value = p.awardedValue || p.valueHigh || p.valueLow || undefined;
        const numericValue = typeof value === 'number' ? value :
            typeof value === 'string' ? parseFloat(value) : undefined;

        // Map notice status
        const statusMap: Record<string, string> = {
            'published': 'Contract Notice',
            'awarded': 'Contract Award',
            'closed': 'Closed',
            'withdrawn': 'Withdrawn',
            'cancelled': 'Cancelled',
        };

        const opp: Opportunity = {
            id: `cf-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: this.cleanText(title),
            description: this.cleanText(description).substring(0, 2000),
            sourceUrl: `https://www.contractsfinder.service.gov.uk/notice/${p.id || raw.id}`,
            publishedAt: p.publishedDate ? new Date(p.publishedDate) : new Date(),
            deadlineAt: p.deadlineDate ? new Date(p.deadlineDate) : undefined,
            noticeType: statusMap[p.noticeStatus?.toLowerCase()] || p.noticeType || 'Contract Notice',
            valueExt: numericValue && !isNaN(numericValue) ? numericValue : undefined,
            valueCurrency: 'GBP',
            country: 'gb',
            region: p.regionText || p.region || 'United Kingdom',
            organisation: p.organisationName || 'UK Government',
            domain: this.inferDomain(title, description),
            keywords: this.extractKeywords(p),
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

    private extractKeywords(notice: any): string[] {
        const tags: string[] = ['defence', 'UK', 'procurement'];
        if (notice.cpvDescription) tags.push(notice.cpvDescription);
        if (notice.sector) tags.push(notice.sector);
        if (notice.noticeType) tags.push(notice.noticeType);
        return tags.slice(0, 10);
    }
}
