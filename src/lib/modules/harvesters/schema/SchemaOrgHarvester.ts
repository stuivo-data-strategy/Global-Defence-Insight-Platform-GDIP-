import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Event
} from '../types';

/**
 * Schema.org JSON-LD harvester
 * - Fetches provided URLs (or a single searchUrl) and extracts <script type="application/ld+json"> blocks
 * - Finds objects with @type === 'Event' and returns them as RawData
 */
export class SchemaOrgHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'schema-org-harvester',
        name: 'Schema.org JSON-LD Harvester',
        version: '1.0.0',
        description: 'Extracts Event data from pages exposing schema.org JSON-LD markup.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['list', 'search'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        const urls: string[] = [];
        if (params.urls && Array.isArray(params.urls)) urls.push(...params.urls);
        if (params.searchUrl && typeof params.searchUrl === 'string') urls.push(params.searchUrl);
        // If none provided, return empty (harvester can be used by passing URLs)
        if (urls.length === 0) {
            console.warn('[SchemaOrg] No urls provided to fetch');
            return [];
        }

        const results: RawData[] = [];

        for (const u of urls) {
            try {
                const res = await fetch(u, { headers: { 'Accept': 'text/html' } });
                if (!res.ok) {
                    console.warn('[SchemaOrg] Failed to fetch', u, res.status);
                    continue;
                }
                const text = await res.text();

                // Extract <script type="application/ld+json"> blocks
                const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
                let m: RegExpExecArray | null;
                let idx = 0;
                let scriptCount = 0;
                while ((m = re.exec(text)) !== null) {
                    scriptCount++;
                    try {
                        const parsed = JSON.parse(m[1]);
                        const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
                        for (const item of items) {
                            if (!item) continue;
                            // JSON-LD may wrap graph
                            if (item['@graph'] && Array.isArray(item['@graph'])) {
                                for (const g of item['@graph']) {
                                    if (g['@type'] && (g['@type'] === 'Event' || (Array.isArray(g['@type']) && g['@type'].includes('Event')))) {
                                        results.push({
                                            id: `schema-${encodeURIComponent(u)}-${idx}`,
                                            source: u,
                                            harvestedAt: new Date(),
                                            rawPayload: g
                                        });
                                        idx++;
                                    }
                                }
                            }

                            if (item['@type'] && (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event')))) {
                                results.push({
                                    id: `schema-${encodeURIComponent(u)}-${idx}`,
                                    source: u,
                                    harvestedAt: new Date(),
                                    rawPayload: item
                                });
                                idx++;
                            }
                        }
                    } catch (e) {
                        console.warn('[SchemaOrg] JSON-LD parse error on', u, e?.message || e);
                    }
                }
                console.log(`[SchemaOrg] Fetched ${u} — found ${scriptCount} JSON-LD script blocks, extracted ${idx} candidate events`);
            } catch (err) {
                console.error('[SchemaOrg] Error fetching', u, err);
            }
        }

        return results;
    }

    normalise(raw: RawData): Event {
        const p = raw.rawPayload;
        const name = p.name || p.headline || '';
        const description = p.description || '';
        const startDate = p.startDate ? new Date(p.startDate) : new Date();
        const endDate = p.endDate ? new Date(p.endDate) : new Date(startDate);
        let location = undefined;
        if (p.location) {
            if (typeof p.location === 'string') location = p.location;
            else if (p.location.name || p.location.address) {
                const addr = p.location.address || {};
                const parts = [p.location.name, addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry];
                location = parts.filter(Boolean).join(', ');
            }
        }

        const websiteUrl = p.url || p.sameAs || raw.source;

        const lc = `${name} ${description}`.toLowerCase();
        let eventType: Event['eventType'] = 'other';
        if (lc.includes('expo') || lc.includes('exhibition')) eventType = 'expo';
        else if (lc.includes('conference') || lc.includes('summit')) eventType = 'conference';
        else if (lc.includes('trade show') || lc.includes('tradeshow')) eventType = 'trade_show';
        else if (lc.includes('innovation') || lc.includes('hackathon')) eventType = 'innovation';

        return {
            id: `evt-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: String(name).trim(),
            description: String(description).trim(),
            startDate,
            endDate,
            location,
            eventType,
            websiteUrl
        };
    }

    async healthcheck(): Promise<HarvesterStatus> {
        return 'healthy';
    }
}

export default SchemaOrgHarvester;
