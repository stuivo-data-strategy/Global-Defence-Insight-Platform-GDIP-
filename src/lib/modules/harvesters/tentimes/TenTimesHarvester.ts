import type { Harvester, HarvesterMetadata, Capability, RawData, HarvesterStatus, Event } from '../types';
import { extractAnchorEvents } from '../utils/htmlScraper';

/**
 * 10times harvester
 * - Primarily uses schema.org JSON-LD extraction from provided pages
 * - If a searchUrl is provided, will fetch that page and attempt extraction
 */
export class TenTimesHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'tentimes-harvester',
        name: '10times Harvester',
        version: '1.0.0',
        description: 'Extracts events from 10times or other industry sites exposing schema.org JSON-LD.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata { return this.metadata; }
    capabilities(): Capability[] { return ['search', 'list']; }

    private async extractFromPage(u: string): Promise<RawData[]> {
        try {
            const res = await fetch(u, { headers: { 'Accept': 'text/html' } });
            if (!res.ok) return [];
            const text = await res.text();
            const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            let m: RegExpExecArray | null; const out: RawData[] = []; let idx = 0;
            while ((m = re.exec(text)) !== null) {
                try {
                    const parsed = JSON.parse(m[1]);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    for (const item of items) {
                        if (!item) continue;
                        if (item['@type'] && (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event')))) {
                            out.push({ id: `10x-${encodeURIComponent(u)}-${idx}`, source: u, harvestedAt: new Date(), rawPayload: item }); idx++;
                        }
                        if (item['@graph'] && Array.isArray(item['@graph'])) {
                            for (const g of item['@graph']) {
                                if (g['@type'] && (g['@type'] === 'Event' || (Array.isArray(g['@type']) && g['@type'].includes('Event')))) {
                                    out.push({ id: `10x-${encodeURIComponent(u)}-${idx}`, source: u, harvestedAt: new Date(), rawPayload: g }); idx++;
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
        const urls: string[] = [];
        if (params.urls && Array.isArray(params.urls)) urls.push(...params.urls);
        if (params.searchUrl && typeof params.searchUrl === 'string') urls.push(params.searchUrl);
        const results: RawData[] = [];
        for (const u of urls) {
            const r = await this.extractFromPage(u);
            results.push(...r);
            if (r.length === 0) {
                try {
                    const res = await fetch(u, { headers: { 'Accept': 'text/html' } });
                    if (res.ok) {
                        const text = await res.text();
                        const anchors = extractAnchorEvents(text, u);
                        anchors.forEach((a, idx) => results.push({ id: `10x-anchor-${encodeURIComponent(u)}-${idx}`, source: u, harvestedAt: new Date(), rawPayload: { name: a.title, url: a.url } }));
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
        const name = p.name || p.headline || '';
        const description = p.description || '';
        const startDate = p.startDate ? new Date(p.startDate) : new Date();
        const endDate = p.endDate ? new Date(p.endDate) : new Date(startDate);
        const websiteUrl = p.url || raw.source;
        return {
            id: `10x-${raw.id}`,
            workspaceId: 'system-workspace',
            createdAt: new Date(), updatedAt: new Date(),
            name: String(name).trim(), description: String(description).trim(),
            startDate, endDate,
            location: (p.location && (p.location.name || p.location.address && p.location.address.addressLocality)) || undefined,
            eventType: 'expo', websiteUrl
        };
    }

    async healthcheck(): Promise<HarvesterStatus> { return 'healthy'; }
}

export default TenTimesHarvester;
