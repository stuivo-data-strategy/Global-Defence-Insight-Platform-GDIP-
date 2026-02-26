import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity
} from '../types';

// Defence-related CPV codes for TED filtering
const DEFENCE_CPV_CODES = [
    '35000000', // Defence, security and safety equipment
    '35100000', // Emergency and security equipment
    '35200000', // Police equipment
    '35300000', // Weapons, ammunition and associated parts
    '35400000', // Military vehicles and parts
    '35500000', // Warships
    '35600000', // Military aircraft
    '35700000', // Military electronic systems
];

// Map CPV code prefixes to defence domains
const CPV_DOMAIN_MAP: Record<string, Opportunity['domain']> = {
    '35600': 'air',    // Military aircraft
    '35400': 'land',   // Military vehicles
    '35500': 'sea',    // Warships
    '35700': 'cyber',  // Military electronic systems
    '35300': 'land',   // Weapons, ammunition
    '35200': 'land',   // Police equipment
    '35100': 'multi',  // Emergency & security
    '35000': 'multi',  // General defence
};

// Map TED notice types to our internal types
const NOTICE_TYPE_MAP: Record<string, string> = {
    'pin': 'Prior Information Notice',
    'cn': 'Contract Notice',
    'can': 'Contract Award',
    'veat': 'Voluntary Ex-Ante Transparency',
    'corr': 'Corrigendum',
    'subco': 'Subcontracting',
};

const TED_API_BASE = 'https://api.ted.europa.eu/v3';
const TED_NOTICE_URL = 'https://ted.europa.eu/en/notice/-/detail';

export class TedHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'ted-defence-harvester',
        name: 'TED Defence Harvester',
        version: '1.0.0',
        description: 'Fetches live EU defence procurement notices from the TED (Tenders Electronic Daily) API.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const publishedSince = params.publishedSince || this.getDefaultSinceDate();

        console.log(`[TED Harvester] Fetching page ${page}, limit ${limit}, since ${publishedSince}`);

        // Build TED API search query using Expert Search syntax
        // Use wildcard 35* to match all defence sub-codes, dates in YYYYMMDD format
        const query = `classification-cpv = 35* AND PD >= ${publishedSince}`;

        try {
            const response = await fetch(`${TED_API_BASE}/notices/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    page,
                    limit,
                    // TED v3 uses internal field identifiers
                    fields: [
                        'title-lot',
                        'BT-24-Procedure',
                        'buyer-name',
                        'buyer-city',
                        'buyer-country',
                        'main-classification-proc',
                        'estimated-value-part',
                        'notice-identifier',
                        'notice-subtype',
                        'total-value',
                    ],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[TED Harvester] API error ${response.status}:`, errorText.substring(0, 500));
                throw new Error(`TED API returned ${response.status}`);
            }

            const data = await response.json();

            // TED v3 returns results in various shapes
            const notices = data.notices || data.results || data.content || [];
            // If it's a paginated wrapper
            const actualNotices = Array.isArray(notices) ? notices : [];

            console.log(`[TED Harvester] Received ${actualNotices.length} notices (keys: ${Object.keys(data).join(', ')})`);

            // Debug: log the first result structure
            if (actualNotices.length > 0) {
                console.log(`[TED Harvester] Sample notice keys:`, Object.keys(actualNotices[0]).join(', '));
            }

            return actualNotices.map((notice: any, index: number) => ({
                id: notice['notice-identifier'] || notice.noticeIdentifier || notice.NO || `ted-${Date.now()}-${index}`,
                source: 'TED Europa',
                harvestedAt: new Date(),
                rawPayload: notice,
            }));
        } catch (error: any) {
            console.error('[TED Harvester] Fetch failed:', error.message);
            return [];
        }
    }

    normalise(raw: RawData): Opportunity {
        const p = raw.rawPayload;

        // Extract fields — TED API uses various casing/nesting patterns
        const title = this.extractField(p, ['title', 'BT-21-Procedure', 'contract-title']) || 'Untitled TED Notice';
        const description = this.extractField(p, ['description', 'short-description', 'BT-24-Procedure', 'shortDescription']) || '';
        const buyerCountry = this.extractField(p, ['buyer-country', 'buyerCountry', 'country']) || '';
        const buyerCity = this.extractField(p, ['buyer-city', 'buyerCity', 'city']) || '';
        const buyerName = this.extractField(p, ['buyer-name', 'buyerName', 'organisation']) || '';
        const noticeType = this.extractField(p, ['notice-type', 'noticeType', 'formType']) || 'Contract Notice';
        const estimatedValue = this.extractNumericField(p, ['estimated-value', 'estimatedValue', 'value']);
        const publicationDate = this.extractField(p, ['publication-date', 'publicationDate', 'PD']);
        const deadlineDate = this.extractField(p, ['deadline-receipt-tenders', 'deadlineDate', 'DT']);
        const cpvCodes = this.extractCpvCodes(p);
        const docNumber = this.extractField(p, ['document-number', 'documentNumber', 'NO']) || raw.id;

        const opp: Opportunity = {
            id: `ted-${docNumber}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: this.cleanText(title),
            description: this.cleanText(description),
            sourceUrl: `${TED_NOTICE_URL}/${docNumber}`,
            publishedAt: publicationDate ? new Date(publicationDate) : new Date(),
            deadlineAt: deadlineDate ? new Date(deadlineDate) : undefined,
            noticeType: NOTICE_TYPE_MAP[noticeType.toLowerCase()] || noticeType,
            valueExt: estimatedValue || undefined,
            valueCurrency: 'EUR',
            country: this.normaliseCountryCode(buyerCountry),
            region: buyerCity || 'EU',
            organisation: buyerName || 'EU Contracting Authority',
            domain: this.inferDomain(cpvCodes),
            keywords: cpvCodes.length > 0 ? cpvCodes : ['defence', 'procurement', 'EU'],
            workflowStage: 'New',
        };

        return opp;
    }

    async healthcheck(): Promise<HarvesterStatus> {
        try {
            // Lightweight ping — search with minimal results
            const response = await fetch(`${TED_API_BASE}/notices/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: 'cpv = "35000000"',
                    page: 1,
                    limit: 1,
                }),
            });

            if (response.ok) return 'healthy';
            if (response.status === 429) return 'degraded'; // Rate limited
            return 'degraded';
        } catch {
            return 'offline';
        }
    }

    // --- Private helpers ---

    private getDefaultSinceDate(): string {
        // Default to 90 days ago, in YYYYMMDD format (TED Expert Search format)
        const d = new Date();
        d.setDate(d.getDate() - 90);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    private extractField(obj: any, keys: string[]): string | undefined {
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) {
                const val = obj[key];
                // Handle arrays (TED sometimes returns arrays for multilingual fields)
                if (Array.isArray(val)) return val[0]?.toString();
                if (typeof val === 'object') {
                    // Check for language-keyed objects { en: "...", fr: "..." }
                    return val.en || val.EN || Object.values(val)[0]?.toString();
                }
                return val.toString();
            }
        }
        return undefined;
    }

    private extractNumericField(obj: any, keys: string[]): number | undefined {
        const val = this.extractField(obj, keys);
        if (!val) return undefined;
        const num = parseFloat(val.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? undefined : num;
    }

    private extractCpvCodes(obj: any): string[] {
        const raw = obj.cpv || obj['cpv-code'] || obj.cpvCodes || [];
        if (Array.isArray(raw)) return raw.map((c: any) => c.toString());
        if (typeof raw === 'string') return [raw];
        return [];
    }

    private inferDomain(cpvCodes: string[]): Opportunity['domain'] {
        for (const code of cpvCodes) {
            for (const [prefix, domain] of Object.entries(CPV_DOMAIN_MAP)) {
                if (code.startsWith(prefix)) return domain;
            }
        }
        return 'multi';
    }

    private normaliseCountryCode(code: string): string {
        // TED uses ISO 3166-1 alpha-2 codes but in uppercase
        // Our UI expects lowercase for flagcdn
        if (!code) return '';
        const cleaned = code.trim().toLowerCase();
        // Handle "United Kingdom" special case
        if (cleaned === 'uk') return 'gb';
        return cleaned;
    }

    private cleanText(text: string): string {
        // Strip HTML tags and excessive whitespace that TED sometimes includes
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
