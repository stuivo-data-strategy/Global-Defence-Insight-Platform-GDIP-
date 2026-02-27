import { json } from '@sveltejs/kit';
import { db } from '$lib/modules/database/client';
import { events } from '$lib/modules/database/schema';
import { inArray } from 'drizzle-orm';

export async function POST({ request }: any) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!body || body.confirm !== true) {
            return json({ success: false, error: 'Missing confirm=true in request body' }, { status: 400 });
        }

        // Delete all events in batches to avoid long transactions
        const batchSize = 500;
        while (true) {
            const batch = await db.select({ id: events.id }).from(events).limit(batchSize);
            if (!batch || batch.length === 0) break;
            const ids = batch.map(b => b.id);
            await db.delete(events).where(inArray(events.id, ids));
            if (batch.length < batchSize) break;
        }

        return json({ success: true });
    } catch (error: any) {
        console.error('Failed to purge events:', error);
        return json({ success: false, error: error.message || 'Failed to purge events' }, { status: 500 });
    }
}
