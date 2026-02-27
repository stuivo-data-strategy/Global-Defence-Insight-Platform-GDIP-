export function extractAnchorEvents(html: string, baseUrl?: string) {
    // Very small heuristic extractor: finds anchor tags and returns those whose href
    // contains event-related keywords. Returns array of { title, url }
    const out: { title: string; url: string }[] = [];
    const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        try {
            const href = m[1];
            const text = m[2].replace(/<[^>]+>/g, '').trim();
            if (!href || href.length < 3) continue;
            const lc = href.toLowerCase() + ' ' + text.toLowerCase();
            if (/event|conference|expo|summit|symposium|workshop|meetup|trade\-show|trade show/.test(lc)) {
                let url = href;
                if (baseUrl && url.startsWith('/')) {
                    url = baseUrl.replace(/\/+$/, '') + url;
                }
                out.push({ title: text || url, url });
            }
        } catch {
            // ignore
        }
    }
    return out;
}

export default extractAnchorEvents;
