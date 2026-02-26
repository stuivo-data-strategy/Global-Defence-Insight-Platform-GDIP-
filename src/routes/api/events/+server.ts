import { json } from '@sveltejs/kit';
import { db } from '$lib/modules/database/client';
import { events } from '$lib/modules/database/schema';
import { desc, asc } from 'drizzle-orm';

export async function GET() {
    try {
        // Query the database for upcoming events, ordered by soonest first
        const results = await db.query.events.findMany({
            orderBy: [asc(events.startDate)]
        });

        // Ensure dates are parsed as strings for JSON serialization exactly as the frontend expects
        const mappedResults = results.map(evt => ({
            ...evt,
            startDate: evt.startDate.toISOString(),
            endDate: evt.endDate.toISOString(),
            createdAt: evt.createdAt.toISOString(),
            updatedAt: evt.updatedAt.toISOString(),
        }));

        return json({
            data: mappedResults
        });
    } catch (error: any) {
        console.error('Failed to fetch events:', error);
        return json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}
