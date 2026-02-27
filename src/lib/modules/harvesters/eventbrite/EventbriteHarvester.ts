import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Event
} from '../types';

const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

export class EventbriteHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'eventbrite-harvester',
        name: 'Eventbrite Harvester',
        version: '1.0.0',
        description: 'Fetches events from Eventbrite (conferences, expos, summits).',
        author: 'GDIP System'
    };

    private token: string | undefined;

    constructor(token?: string) {
        this.token = token || (typeof process !== 'undefined' ? process.env?.EVENTBRITE_TOKEN : undefined);
    }

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        // Priority: params.token -> constructor token -> runtime env
        const token = params?.token || this.token || (typeof process !== 'undefined' ? process.env?.EVENTBRITE_TOKEN : undefined);
        if (!token) {
            console.warn('[Eventbrite] No token set (EVENTBRITE_TOKEN). Skipping.');
            return [];
        }

        const limit = params.limit || params.count || 20;
        const query = params.q || 'defense OR defence OR military OR "defense expo" OR "defence expo" OR conference OR summit OR exhibition';
        const startRange = new Date().toISOString(); // future events by default

        const perPage = Math.min(50, limit);
        const results: RawData[] = [];
        let page = 1;
        let totalCollected = 0;
        try {
            while (totalCollected < limit) {
                const searchParams = new URLSearchParams({
                    q: query,
                    'start_date.range_start': startRange,
                    'sort_by': 'date',
                    'page_size': String(perPage),
                    'page': String(page),
                    'expand': 'venue'
                } as Record<string, string>);

                const res = await fetch(`${EVENTBRITE_API_BASE}/events/search/?${searchParams.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        // Eventbrite supports Private Tokens when Bearer doesn't work for certain endpoints
                        'Private-Token': token,
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    console.error('[Eventbrite] API error', res.status, text.substring(0, 300));
                    break;
                }

                const data = await res.json();
                const events = data.events || [];
                for (let i = 0; i < events.length && totalCollected < limit; i++) {
                    results.push({ id: events[i].id || `eb-${Date.now()}-${page}-${i}`, source: 'Eventbrite', harvestedAt: new Date(), rawPayload: events[i] });
                    totalCollected++;
                }

                // pagination hint
                const hasMore = data.pagination ? !!data.pagination.has_more_items : events.length === perPage;
                if (!hasMore) break;
                page++;
                if (page > 20) break; // safety
            }
            return results;
        } catch (error: any) {
            console.error('[Eventbrite] Fetch failed:', error?.message || error);
            return results;
        }
    }

    normalise(raw: RawData): Event {
        const p = raw.rawPayload;

        const name = (p.name && (p.name.text || p.name.html)) || p.summary || 'Untitled Event';
        const description = (p.description && (p.description.text || p.description.html)) || '';
        const startDate = p.start?.utc ? new Date(p.start.utc) : p.start?.local ? new Date(p.start.local) : new Date();
        const endDate = p.end?.utc ? new Date(p.end.utc) : p.end?.local ? new Date(p.end.local) : new Date(startDate);

        let location = '';
        if (p.venue) {
            const addr = p.venue.address || {};
            const parts = [p.venue.name, addr.localized_address_display, addr.city, addr.region, addr.country];
            location = parts.filter(Boolean).join(', ');
        } else if (p.online_event) {
            location = 'Online Event';
        }

        // Simple event type mapping using name/description/category hints
        const lc = `${name} ${description}`.toLowerCase();
        let eventType: Event['eventType'] = 'other';
        if (lc.includes('expo') || lc.includes('exhibition')) eventType = 'expo';
        else if (lc.includes('conference') || lc.includes('summit')) eventType = 'conference';
        else if (lc.includes('trade show') || lc.includes('tradeshow')) eventType = 'trade_show';
        else if (lc.includes('innovation') || lc.includes('hackathon')) eventType = 'innovation';

        const evt: Event = {
            id: `eb-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: String(name).trim(),
            description: String(description).trim(),
            startDate,
            endDate,
            location: location || undefined,
            eventType,
            websiteUrl: p.url || p.resource_uri || undefined
        };

        return evt;
    }

    async healthcheck(): Promise<HarvesterStatus> {
        const token = this.token || (typeof process !== 'undefined' ? process.env?.EVENTBRITE_TOKEN : undefined);
        if (!token) return 'offline';
        try {
            const res = await fetch(`${EVENTBRITE_API_BASE}/events/search/?q=conference&page_size=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) return 'healthy';
            if (res.status === 429) return 'degraded';
            return 'degraded';
        } catch {
            return 'offline';
        }
    }
}

export default EventbriteHarvester;
