import { json } from '@sveltejs/kit';
import { db } from '$lib/modules/database/client';
import { opportunities } from '$lib/modules/database/schema';
import { desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET() {
    try {
        // Query the database for live opportunities, ordered by newest first
        const results = await db.query.opportunities.findMany({
            orderBy: [desc(opportunities.publishedAt)]
        });

        // Ensure dates are parsed as strings for JSON serialization exactly as the frontend expects
        const mappedResults = results.map(opp => ({
            ...opp,
            publishedAt: opp.publishedAt?.toISOString(),
            deadlineAt: opp.deadlineAt?.toISOString(),
            createdAt: opp.createdAt.toISOString(),
            updatedAt: opp.updatedAt.toISOString(),
        }));

        return json({
            data: mappedResults
        });
    } catch (error: any) {
        console.error('Failed to fetch opportunities:', error);
        return json({ error: 'Failed to fetch opportunities' }, { status: 500 });
    }
}

import { eq } from 'drizzle-orm';

export async function PATCH({ request }: RequestEvent) {
    try {
        const body = await request.json();

        if (!body.id) {
            return json({ success: false, error: 'Missing id parameter' }, { status: 400 });
        }

        // Build update payload from allowed fields
        const allowedFields = ['workflowStage', 'probability', 'reviewValue', 'bidValue', 'awardValue', 'ownerId'] as const;
        const validStages = ["New", "Review", "Bid", "Pursue", "Closed"];
        const updatePayload: Record<string, any> = { updatedAt: new Date() };

        // Support legacy `stage` field from drag-drop
        if (body.stage) {
            if (!validStages.includes(body.stage)) {
                return json({ success: false, error: 'Invalid workflow stage' }, { status: 400 });
            }
            updatePayload.workflowStage = body.stage;
        }

        // Support new `updates` object from CRM form
        if (body.updates && typeof body.updates === 'object') {
            for (const field of allowedFields) {
                if (field in body.updates) {
                    if (field === 'workflowStage' && !validStages.includes(body.updates[field])) {
                        return json({ success: false, error: 'Invalid workflow stage' }, { status: 400 });
                    }
                    updatePayload[field] = body.updates[field];
                }
            }
        }

        await db.update(opportunities)
            .set(updatePayload)
            .where(eq(opportunities.id, body.id));

        return json({ success: true, updatedId: body.id });
    } catch (error: any) {
        console.error('Failed to update opportunity:', error);
        return json({ success: false, error: 'Failed to update opportunity' }, { status: 500 });
    }
}
