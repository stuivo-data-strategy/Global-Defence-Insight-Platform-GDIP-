import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity
} from '../types';

// Defence-related NAICS codes
const DEFENCE_NAICS = [
    '336411', // Aircraft manufacturing
    '336414', // Guided missile/space vehicle manufacturing
    '336992', // Military armored vehicle manufacturing
    '332993', // Ammunition manufacturing
    '334511', // Search, detection, navigation systems
    '334290', // Other communications equipment
    '336611', // Ship building and repairing
    '928110', // National security
];

const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';

export class SamGovHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'sam-gov-defence-harvester',
        name: 'SAM.gov Defence Harvester',
        version: '1.0.0',
        description: 'Fetches US federal defence contract opportunities from SAM.gov.',
        author: 'GDIP System'
    };

    private apiKey: string;

    constructor() {
        // SAM.gov requires an API key — read from env
        this.apiKey = typeof process !== 'undefined'
            ? (process.env?.SAM_GOV_API_KEY || '')
            : '';
    }

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        if (!this.apiKey) {
            console.warn('[SAM.gov] No API key found (SAM_GOV_API_KEY). Skipping.');
            return [];
        }

        const limit = params.limit || 25;
        const offset = params.offset || 0;
        const postedFrom = params.postedFrom || this.getDefaultSinceDate();

        console.log(`[SAM.gov] Fetching ${limit} opportunities since ${postedFrom}`);

        try {
            // SAM.gov uses GET with query params
            const searchParams = new URLSearchParams({
                api_key: this.apiKey,
                limit: limit.toString(),
                offset: offset.toString(),
                postedFrom,
                ptype: 'o',  // Opportunities only
                // Filter for DoD and defence-related agencies
                organizationId: '100000000', // Department of Defense umbrella
            });

            const response = await fetch(`${SAM_API_BASE}?${searchParams}`, {
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[SAM.gov] API error ${response.status}:`, errorText.substring(0, 300));
                throw new Error(`SAM.gov API returned ${response.status}`);
            }

            const data = await response.json();
            const opportunities = data.opportunitiesData || data.opportunities || [];

            console.log(`[SAM.gov] Received ${opportunities.length} opportunities`);

            return opportunities.map((opp: any, index: number) => ({
                id: opp.noticeId || opp.solicitationNumber || `sam-${Date.now()}-${index}`,
                source: 'SAM.gov',
                harvestedAt: new Date(),
                rawPayload: opp,
            }));
        } catch (error: any) {
            console.error('[SAM.gov] Fetch failed:', error.message);
            return [];
        }
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        const title = p.title || p.solicitationTitle || 'Untitled SAM.gov Opportunity';
        const description = p.description || p.additionalInfoLink || '';

        // Map SAM.gov type codes to readable names
        const typeMap: Record<string, string> = {
            'o': 'Solicitation', 'p': 'Pre-solicitation', 'r': 'Sources Sought',
            'k': 'Combined Synopsis/Solicitation', 's': 'Sale of Surplus',
            'i': 'Intent to Bundle', 'a': 'Award Notice',
        };

        const opp: Opportunity = {
            id: `sam-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title,
            description: typeof description === 'string' ? description.substring(0, 2000) : '',
            sourceUrl: p.uiLink || `https://sam.gov/opp/${raw.id}/view`,
            publishedAt: p.postedDate ? new Date(p.postedDate) : new Date(),
            deadlineAt: p.responseDeadLine ? new Date(p.responseDeadLine) : undefined,
            noticeType: typeMap[p.type?.toLowerCase()] || p.type || 'Solicitation',
            valueExt: p.award?.amount || undefined,
            valueCurrency: 'USD',
            country: 'us',
            region: p.placeOfPerformance?.state?.name || p.officeAddress?.state || 'US',
            organisation: p.fullParentPathName || p.department || 'US Department of Defense',
            domain: this.inferDomainFromNaics(p.naicsCode),
            keywords: [p.naicsCode, p.classificationCode, 'defence', 'US', 'federal'].filter(Boolean),
            workflowStage: 'New',
        };

        return opp;
    }

    async healthcheck(): Promise<HarvesterStatus> {
        if (!this.apiKey) return 'offline';
        try {
            const params = new URLSearchParams({
                api_key: this.apiKey,
                limit: '1',
                ptype: 'o',
            });
            const response = await fetch(`${SAM_API_BASE}?${params}`);
            if (response.ok) return 'healthy';
            if (response.status === 429) return 'degraded';
            return 'degraded';
        } catch {
            return 'offline';
        }
    }

    private getDefaultSinceDate(): string {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    }

    private inferDomainFromNaics(code: string): Opportunity['domain'] {
        if (!code) return 'multi';
        const naicsMap: Record<string, Opportunity['domain']> = {
            '336411': 'air', '336414': 'air',
            '336992': 'land', '332993': 'land',
            '334511': 'cyber', '334290': 'cyber',
            '336611': 'sea',
            '928110': 'multi',
        };
        return naicsMap[code] || 'multi';
    }
}
