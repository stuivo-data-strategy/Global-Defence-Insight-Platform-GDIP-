import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity
} from '../types';

const AUSTENDER_API_BASE = 'https://api.tenders.gov.au';

export class AusTenderHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'austender-defence-harvester',
        name: 'AusTender Defence Harvester',
        version: '1.0.0',
        description: 'Fetches Australian defence procurement opportunities from the AusTender OCDS API.',
        author: 'GDIP System'
    };

    private apiToken: string;

    constructor() {
        this.apiToken = typeof process !== 'undefined'
            ? (process.env?.AUSTENDER_API_TOKEN || '')
            : '';
    }

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        if (!this.apiToken) {
            console.warn('[AusTender] No API token found (AUSTENDER_API_TOKEN). Skipping.');
            return [];
        }

        const limit = params.limit || 20;
        const since = params.publishedSince || this.getDefaultSinceDate();

        console.log(`[AusTender] Fetching ${limit} opportunities since ${since}`);

        try {
            // AusTender uses OCDS-style API
            const searchParams = new URLSearchParams({
                'publishedFrom': since,
                'category': 'Defence',
                'status': 'published',
                'limit': limit.toString(),
            });

            const response = await fetch(`${AUSTENDER_API_BASE}/ocds/releases?${searchParams}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.apiToken}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[AusTender] API error ${response.status}:`, errorText.substring(0, 300));
                throw new Error(`AusTender API returned ${response.status}`);
            }

            const data = await response.json();
            const releases = data.releases || data.results || [];

            console.log(`[AusTender] Received ${releases.length} releases`);

            return releases.map((release: any, index: number) => ({
                id: release.ocid || release.id || `at-${Date.now()}-${index}`,
                source: 'AusTender',
                harvestedAt: new Date(),
                rawPayload: release,
            }));
        } catch (error: any) {
            console.error('[AusTender] Fetch failed:', error.message);
            return [];
        }
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;
        const tender = p.tender || {};
        const buyer = p.buyer || {};

        const title = tender.title || p.title || 'Australian Defence Opportunity';
        const description = tender.description || p.description || '';

        return {
            id: `at-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title,
            description: description.substring(0, 2000),
            sourceUrl: `https://www.tenders.gov.au/Search/SearchResult?keyword=${encodeURIComponent(raw.id)}`,
            publishedAt: p.date ? new Date(p.date) : new Date(),
            deadlineAt: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : undefined,
            noticeType: this.mapStatus(tender.status),
            valueExt: tender.value?.amount || undefined,
            valueCurrency: tender.value?.currency || 'AUD',
            country: 'au',
            region: buyer.address?.region || 'Australia',
            organisation: buyer.name || 'Australian Department of Defence',
            domain: this.inferDomain(title, description),
            keywords: ['Australia', 'defence', 'AusTender', ...(tender.categories || [])].filter(Boolean),
            workflowStage: 'New',
        };
    }

    async healthcheck(): Promise<HarvesterStatus> {
        if (!this.apiToken) return 'offline';
        try {
            const response = await fetch(`${AUSTENDER_API_BASE}/ocds/releases?limit=1`, {
                headers: { 'Authorization': `Bearer ${this.apiToken}` },
            });
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
        return d.toISOString().split('T')[0];
    }

    private mapStatus(status: string): string {
        const map: Record<string, string> = {
            'planning': 'Prior Information Notice',
            'active': 'Approach to Market',
            'closed': 'Closed ATM',
            'complete': 'Contract Award',
        };
        return map[status?.toLowerCase()] || status || 'Approach to Market';
    }

    private inferDomain(title: string, description: string): Opportunity['domain'] {
        const text = `${title} ${description}`.toLowerCase();
        if (/\b(aircraft|raaf|aviation|air force|helicopter|f-?35)\b/.test(text)) return 'air';
        if (/\b(naval|navy|ran|maritime|ship|submarine|frigate)\b/.test(text)) return 'sea';
        if (/\b(cyber|information|electronic|software|digital|signals)\b/.test(text)) return 'cyber';
        if (/\b(space|satellite|jorn)\b/.test(text)) return 'space';
        if (/\b(army|vehicle|weapon|infantry|land)\b/.test(text)) return 'land';
        return 'multi';
    }
}
