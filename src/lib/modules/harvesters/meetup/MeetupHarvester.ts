import type { Harvester, HarvesterMetadata, Capability, RawData, HarvesterStatus, Event } from '../types';
import { extractAnchorEvents } from '../utils/htmlScraper';

/**
 * Meetup harvester
 * - If `params.token` provided, attempts to use Meetup API `/find/upcoming_events`.
 * - Otherwise falls back to fetching provided `urls` and extracting schema.org JSON-LD Events.
 */
export class MeetupHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'meetup-harvester',
        name: 'Meetup Harvester',
        version: '1.0.0',
        description: 'Fetches Meetup events via API or by scraping schema.org JSON-LD from pages.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list'];
    }

    private async extractJsonLdEventsFromUrl(u: string): Promise<RawData[]> {
        try {
            const res = await fetch(u, { headers: { 'Accept': 'text/html' } });
            if (!res.ok) return [];
            const text = await res.text();
            const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            let m: RegExpExecArray | null;
            const out: RawData[] = [];
            let idx = 0;
            while ((m = re.exec(text)) !== null) {
                try {
                    const parsed = JSON.parse(m[1]);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    for (const item of items) {
                        if (!item) continue;
                        if (item['@type'] && (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event')))) {
                            out.push({ id: `meetup-${encodeURIComponent(u)}-${idx}`, source: u, harvestedAt: new Date(), rawPayload: item });
                            idx++;
                        }
                        if (item['@graph'] && Array.isArray(item['@graph'])) {
                            for (const g of item['@graph']) {
                                if (g['@type'] && (g['@type'] === 'Event' || (Array.isArray(g['@type']) && g['@type'].includes('Event')))) {
                                    out.push({ id: `meetup-${encodeURIComponent(u)}-${idx}`, source: u, harvestedAt: new Date(), rawPayload: g });
                                    idx++;
                                }
                            }
                        }
                    }
                } catch {
                    // ignore parse errors
                }
            }
            return out;
        } catch {
            return [];
        }
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        const token = params?.token;
        const results: RawData[] = [];

        if (token) {
            // Try Meetup API: find upcoming events with simple paging
            try {
                const q = params.q || 'defence';
                const perPage = Math.min(50, params.count || 50);
                let page = 0;
                let totalCollected = 0;
                const maxTotal = params.count || 200;
                while (totalCollected < maxTotal) {
                    page++;
                    const url = `https://api.meetup.com/find/upcoming_events?&text=${encodeURIComponent(q)}&page=${perPage}&page=${perPage}&offset=${page}`;
                    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
                    if (!res.ok) break;
                    const data = await res.json();
                    const events = data.events || [];
                    for (let i = 0; i < events.length && totalCollected < maxTotal; i++) {
                        results.push({ id: events[i].id || `mu-${Date.now()}-${totalCollected}`, source: 'Meetup', harvestedAt: new Date(), rawPayload: events[i] });
                        totalCollected++;
                    }
                    if (!data.events || data.events.length === 0) break;
                    // safety: break if API doesn't provide pagination hints
                    if (page > 10) break;
                }
                if (results.length > 0) return results;
            } catch (e) {
                console.warn('[Meetup] API request failed', e?.message || e);
            }
        }

        // Fallback to URL-based JSON-LD extraction
        const urls: string[] = [];
        if (params.urls && Array.isArray(params.urls)) urls.push(...params.urls);
        if (params.searchUrl && typeof params.searchUrl === 'string') urls.push(params.searchUrl);
        for (const u of urls) {
            // Try JSON-LD first
            const extracted = await this.extractJsonLdEventsFromUrl(u);
            results.push(...extracted);
            // If none found, attempt anchor-based scraping
            if (extracted.length === 0) {
                try {
                    const res = await fetch(u, { headers: { 'Accept': 'text/html' } });
                    if (res.ok) {
                        const text = await res.text();
                        const anchors = extractAnchorEvents(text, u);
                        anchors.forEach((a, idx) => results.push({ id: `meetup-anchor-${encodeURIComponent(u)}-${idx}`, source: u, harvestedAt: new Date(), rawPayload: { name: a.title, url: a.url } }));
                    }
                } catch {
                    // ignore
                }
            }
        }

        return results;
    }

    normalise(raw: RawData): Event {
        const p = raw.rawPayload;
        const name = p.name || p.title || p.name?.text || 'Untitled Meetup Event';
        const description = p.description || p.summary || p.description?.text || '';
        const startDate = p.start_date ? new Date(p.start_date) : p.start?.utc ? new Date(p.start.utc) : new Date();
        const endDate = p.end_date ? new Date(p.end_date) : new Date(startDate);
        const websiteUrl = p.url || p.link || raw.source;
        return {
            id: `mu-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            name: String(name).trim(),
            description: String(description).trim(),
            startDate,
            endDate,
            location: (p.venue && (p.venue.name || (p.venue.address && p.venue.address.localized_address_display))) || undefined,
            eventType: 'conference',
            websiteUrl
        };
    }

    async healthcheck(): Promise<HarvesterStatus> {
        return 'healthy';
    }
}

export default MeetupHarvester;
