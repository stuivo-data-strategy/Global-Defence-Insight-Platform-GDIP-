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
    // Text aliases
    'pin': 'Prior Information Notice',
    'cn': 'Contract Notice',
    'can': 'Contract Award',
    'veat': 'Voluntary Ex-Ante Transparency',
    'corr': 'Corrigendum',
    'subco': 'Subcontracting',
    // eForms numeric subtypes (Annex I)
    // Planning notices
    '1': 'PIN – General (Directive 2014/24/EU)',
    '2': 'PIN – General (Directive 2014/25/EU)',
    '3': 'PIN – Call for Competition (2014/24)',
    '4': 'PIN – Call for Competition (2014/25)',
    '5': 'PIN – Only for Information (2014/24)',
    '6': 'PIN – Only for Information (2014/25)',
    '7': 'PIN – Buyer Profile (2014/24)',
    '8': 'PIN – Buyer Profile (2014/25)',
    '9': 'PIN – Defence/Security (2009/81)',
    '10': 'PIN – Concessions (2014/23)',
    '11': 'PIN – Social (2014/24)',
    '12': 'PIN – Social (2014/25)',
    '13': 'PIN – Concession Social',
    '14': 'PIN – Design Contest',
    // Competition notices (Contract Notices)
    '15': 'Contract Notice – Accelerated (2014/24)',
    '16': 'Contract Notice (2014/24/EU)',
    '17': 'Contract Notice (2014/25/EU)',
    '18': 'Contract Notice – Defence (2009/81)',
    '19': 'Concession Notice',
    '20': 'Contract Notice – Light Regime',
    '21': 'Contract Notice – Social (2014/25)',
    '22': 'Concession Notice – Social',
    '23': 'Design Contest Notice',
    '24': 'Qualification System – Utilities',
    // Direct Award / VEAT
    '25': 'Concession Award – Direct',
    '26': 'Award Without Prior Publication',
    '27': 'Voluntary Ex-Ante Transparency (VEAT)',
    '28': 'Award – Defence Direct (2009/81)',
    // Result notices (Contract Awards)
    '29': 'Contract Award Notice (2014/24/EU)',
    '30': 'Contract Award Notice (2014/25/EU)',
    '31': 'Award – Defence (2009/81)',
    '32': 'Concession Award Notice',
    '33': 'Award – Light Regime',
    '34': 'Award – Social (2014/25)',
    '35': 'Concession Award – Social',
    '36': 'Design Contest Result',
    // Modification notices
    '38': 'Contract Modification',
    '39': 'Concession Modification',
    '40': 'Modification – Light Regime',
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

        // Extract fields using exact TED v3 response keys
        // Title: deeply traverse nested structures (TED returns arrays of multilingual objects)
        const title = this.extractTitle(p) || 'Untitled TED Notice';
        const description = this.extractField(p, ['BT-24-Procedure', 'description', 'short-description']) || '';
        const buyerCountry = this.extractField(p, ['buyer-country', 'country']) || '';
        const buyerCity = this.extractField(p, ['buyer-city', 'city']) || '';
        const buyerName = this.extractField(p, ['buyer-name', 'organisation']) || '';
        const noticeSubtype = this.extractField(p, ['notice-subtype', 'notice-type', 'formType']) || 'cn';
        const estimatedValue = this.extractNumericField(p, ['estimated-value-part', 'total-value', 'estimated-value']);
        const cpvCodes = this.extractCpvCodes(p);
        const noticeId = this.extractField(p, ['notice-identifier']) || raw.id;
        const pubNumber = this.extractField(p, ['publication-number']) || '';

        // Extract publication date from publication-number (format: NNNNNNNN-YYYY)
        // or from a direct date field
        let pubDate: Date | undefined;
        if (pubNumber && pubNumber.includes('-')) {
            const year = pubNumber.split('-').pop();
            if (year && year.length === 4) {
                pubDate = new Date(); // Use current date as TED doesn't directly return pub date in search
            }
        }

        // Extract source URL from links array if available
        let sourceUrl = `${TED_NOTICE_URL}/${noticeId}`;
        if (p.links && Array.isArray(p.links)) {
            const htmlLink = p.links.find((l: any) => l.type === 'html' || l.rel === 'self');
            if (htmlLink?.href) sourceUrl = htmlLink.href;
        }

        const opp: Opportunity = {
            id: `ted-${noticeId}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            title: this.cleanText(title),
            description: this.cleanText(description),
            sourceUrl,
            publishedAt: pubDate || new Date(),
            deadlineAt: undefined,
            noticeType: NOTICE_TYPE_MAP[noticeSubtype.toLowerCase()] || noticeSubtype,
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
        const raw = obj['main-classification-proc'] || obj.cpv || obj['cpv-code'] || obj.cpvCodes || [];
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
        // TED v3 returns ISO 3166-1 alpha-3 codes (e.g. DEU, ESP, POL)
        // flagcdn requires lowercase alpha-2 codes (e.g. de, es, pl)
        if (!code) return '';
        const cleaned = code.trim().toUpperCase();

        // ISO 3166-1 alpha-3 → alpha-2 mapping for EU/EEA + key NATO countries
        const alpha3to2: Record<string, string> = {
            AUT: 'at', BEL: 'be', BGR: 'bg', HRV: 'hr', CYP: 'cy',
            CZE: 'cz', DNK: 'dk', EST: 'ee', FIN: 'fi', FRA: 'fr',
            DEU: 'de', GRC: 'gr', HUN: 'hu', IRL: 'ie', ITA: 'it',
            LVA: 'lv', LTU: 'lt', LUX: 'lu', MLT: 'mt', NLD: 'nl',
            POL: 'pl', PRT: 'pt', ROU: 'ro', SVK: 'sk', SVN: 'si',
            ESP: 'es', SWE: 'se', NOR: 'no', ISL: 'is', LIE: 'li',
            CHE: 'ch', GBR: 'gb', USA: 'us', CAN: 'ca', TUR: 'tr',
            AUS: 'au', JPN: 'jp', KOR: 'kr', ISR: 'il', UKR: 'ua',
            GEO: 'ge', MDA: 'md', ALB: 'al', MNE: 'me', MKD: 'mk',
            SRB: 'rs', BIH: 'ba', XKX: 'xk',
        };

        // If it looks like alpha-3, convert
        if (cleaned.length === 3 && alpha3to2[cleaned]) {
            return alpha3to2[cleaned];
        }

        // If it's already 2 chars, just lowercase
        if (cleaned.length === 2) {
            const lc = cleaned.toLowerCase();
            return lc === 'uk' ? 'gb' : lc;
        }

        // Try first 3 chars for alpha-3 match
        const prefix = cleaned.substring(0, 3);
        if (alpha3to2[prefix]) return alpha3to2[prefix];

        return cleaned.toLowerCase().substring(0, 2);
    }

    /**
     * Deep title extraction — TED returns title-lot as various nested structures:
     * - string: "Title text"
     * - array: ["Title text"] or [{en: "Title"}]
     * - object: {en: "Title"} or {0: {en: "Title"}}
     */
    private extractTitle(payload: any): string | undefined {
        // Try title-lot first (most common in TED v3)
        const titleLot = payload['title-lot'];
        if (titleLot) {
            const extracted = this.deepExtractString(titleLot);
            if (extracted && extracted.length > 3) return extracted;
        }

        // Fallback: BT-21-Procedure
        const bt21 = payload['BT-21-Procedure'];
        if (bt21) {
            const extracted = this.deepExtractString(bt21);
            if (extracted && extracted.length > 3) return extracted;
        }

        // Fallback: use first 120 chars of description as title
        const desc = this.extractField(payload, ['BT-24-Procedure', 'description']);
        if (desc) {
            const text = this.cleanText(desc);
            if (text.length > 120) return text.substring(0, 117) + '...';
            return text;
        }

        return undefined;
    }

    private deepExtractString(val: any): string | undefined {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) {
            // Try each element
            for (const item of val) {
                const result = this.deepExtractString(item);
                if (result && result.length > 3) return result;
            }
            return undefined;
        }
        if (typeof val === 'object') {
            // Try language keys first
            if (val.en) return val.en;
            if (val.EN) return val.EN;
            // Try any value
            const values = Object.values(val);
            for (const v of values) {
                const result = this.deepExtractString(v);
                if (result && result.length > 3) return result;
            }
        }
        return val?.toString();
    }

    private cleanText(text: string): string {
        // Strip HTML tags and excessive whitespace that TED sometimes includes
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
