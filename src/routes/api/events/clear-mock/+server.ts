import { json } from '@sveltejs/kit';
import { db } from '$lib/modules/database/client';
import { events } from '$lib/modules/database/schema';
import { like, inArray } from 'drizzle-orm';

export async function POST() {
    try {
        // Delete events that appear to be from the mock harvester
        // Identification heuristics: websiteUrl contains 'mock-defense-events.local'
        // or name contains 'mock' or 'Global Defense' (case-insensitive)

        // Find matching event ids
        const matches = await db.select({ id: events.id })
            .from(events)
            .where(like(events.websiteUrl, '%mock-defense-events.local%'));

        // Also match by name pattern
        const nameMatches = await db.select({ id: events.id })
            .from(events)
            .where(like(events.name, '%mock%'));

        const allIds = Array.from(new Set([...matches.map(m => m.id), ...nameMatches.map(m => m.id)]));

        if (allIds.length === 0) {
            return json({ success: true, deleted: 0, message: 'No mock events found' });
        }

        // Delete in batches
        const batchSize = 100;
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            await db.delete(events).where(inArray(events.id, batch));
        }

        return json({ success: true, deleted: allIds.length });
    } catch (error: any) {
        console.error('Failed to clear mock events:', error);
        return json({ success: false, error: error.message || 'Failed to clear mock events' }, { status: 500 });
    }
}
