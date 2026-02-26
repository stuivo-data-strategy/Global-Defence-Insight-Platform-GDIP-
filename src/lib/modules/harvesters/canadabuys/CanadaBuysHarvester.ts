import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity
} from '../types';

// CanadaBuys Open Data — OCDS JSON endpoint
const CANADABUYS_API = 'https://canadabuys.canada.ca/cds/public/ocds/tenders/search';

export class CanadaBuysHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'canadabuys-defence-harvester',
        name: 'CanadaBuys Defence Harvester',
        version: '1.0.0',
        description: 'Fetches Canadian defence procurement opportunities from CanadaBuys / BuyAndSell.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        const limit = params.limit || 20;
        console.log(`[CanadaBuys] Fetching ${limit} defence opportunities`);

        try {
            // Try the CanadaBuys search endpoint
            const searchParams = new URLSearchParams({
                'keyword': 'defence OR military OR defense OR armed forces OR DND',
                'limit': limit.toString(),
                'status': 'active',
            });

            const response = await fetch(`${CANADABUYS_API}?${searchParams}`, {
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                // Fallback: try the BuyAndSell tender notices open data
                console.log(`[CanadaBuys] Primary API returned ${response.status}, trying Open Data fallback...`);
                return await this.fetchFromOpenData(limit);
            }

            const data = await response.json();
            const tenders = data.results || data.releases || data.tenders || [];

            console.log(`[CanadaBuys] Received ${tenders.length} tenders`);

            return tenders.map((tender: any, index: number) => ({
                id: tender.ocid || tender.id || `cab-${Date.now()}-${index}`,
                source: 'CanadaBuys',
                harvestedAt: new Date(),
                rawPayload: tender,
            }));
        } catch (error: any) {
            console.error('[CanadaBuys] Fetch failed:', error.message);
            // Try fallback on error
            try {
                return await this.fetchFromOpenData(limit);
            } catch {
                return [];
            }
        }
    }

    private async fetchFromOpenData(limit: number): Promise<RawData[]> {
        // Fallback: BuyAndSell Open Government tender data (CSV-based API)
        const openDataUrl = 'https://open.canada.ca/data/api/3/action/datastore_search';
        const params = new URLSearchParams({
            resource_id: 'fac950c0-00d5-4ec1-a4d3-9cbebf98a305', // Tender notices dataset
            limit: limit.toString(),
            q: 'defence OR military OR defense',
        });

        const response = await fetch(`${openDataUrl}?${params}`, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            console.error(`[CanadaBuys] Open Data fallback returned ${response.status}`);
            return [];
        }

        const data = await response.json();
        const records = data.result?.records || [];

        console.log(`[CanadaBuys] Open Data fallback returned ${records.length} records`);

        return records.map((record: any, index: number) => ({
            id: record.reference_number || record.solicitation_number || `cab-${Date.now()}-${index}`,
            source: 'CanadaBuys',
            harvestedAt: new Date(),
            rawPayload: { ...record, _source: 'opendata' },
        }));
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        // Handle both OCDS format and Open Data CSV format
        if (p._source === 'opendata') {
            return this.normaliseOpenData(raw);
        }

        const tender = p.tender || {};
        const buyer = p.buyer || {};

        return {
            id: `cab-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: tender.title || p.title || 'Canadian Defence Opportunity',
            description: (tender.description || p.description || '').substring(0, 2000),
            sourceUrl: `https://canadabuys.canada.ca/en/tender-opportunities/${raw.id}`,
            publishedAt: p.date ? new Date(p.date) : new Date(),
            deadlineAt: tender.tenderPeriod?.endDate ? new Date(tender.tenderPeriod.endDate) : undefined,
            noticeType: tender.status || 'Active',
            valueExt: tender.value?.amount || undefined,
            valueCurrency: 'CAD',
            country: 'ca',
            region: buyer.address?.region || 'Canada',
            organisation: buyer.name || 'Government of Canada',
            domain: this.inferDomain(tender.title || '', tender.description || ''),
            keywords: ['Canada', 'defence', 'procurement'],
            workflowStage: 'New',
        };
    }

    private normaliseOpenData(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        return {
            id: `cab-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: p.title_en || p.title || p.description_en?.substring(0, 120) || 'Canadian Defence Opportunity',
            description: (p.description_en || p.description || '').substring(0, 2000),
            sourceUrl: p.tender_url || `https://canadabuys.canada.ca/en/tender-opportunities/${raw.id}`,
            publishedAt: p.publish_date ? new Date(p.publish_date) : new Date(),
            deadlineAt: p.closing_date ? new Date(p.closing_date) : undefined,
            noticeType: p.notice_type || 'Tender Notice',
            valueExt: p.estimated_value ? parseFloat(p.estimated_value) : undefined,
            valueCurrency: 'CAD',
            country: 'ca',
            region: p.region || 'Canada',
            organisation: p.end_user_entity || p.contracting_entity || 'Government of Canada',
            domain: this.inferDomain(p.title_en || '', p.description_en || ''),
            keywords: ['Canada', 'defence', 'PSPC', p.gsin || ''].filter(Boolean),
            workflowStage: 'New',
        };
    }

    async healthcheck(): Promise<HarvesterStatus> {
        try {
            const response = await fetch(`${CANADABUYS_API}?keyword=defence&limit=1`);
            if (response.ok) return 'healthy';
            // Try open data fallback
            const fallbackResponse = await fetch(
                'https://open.canada.ca/data/api/3/action/datastore_search?resource_id=fac950c0-00d5-4ec1-a4d3-9cbebf98a305&limit=1'
            );
            if (fallbackResponse.ok) return 'degraded'; // fallback works but primary doesn't
            return 'offline';
        } catch {
            return 'offline';
        }
    }

    private inferDomain(title: string, description: string): Opportunity['domain'] {
        const text = `${title} ${description}`.toLowerCase();
        if (/\b(aircraft|rcaf|air force|aviation|helicopter|fighter|cf-?18)\b/.test(text)) return 'air';
        if (/\b(naval|navy|rcn|maritime|ship|submarine|frigate|patrol)\b/.test(text)) return 'sea';
        if (/\b(cyber|c4isr|information|electronic|software|signals|cse)\b/.test(text)) return 'cyber';
        if (/\b(space|satellite|norad)\b/.test(text)) return 'space';
        if (/\b(army|vehicle|weapon|infantry|land|armoured|lav)\b/.test(text)) return 'land';
        return 'multi';
    }
}
