import { json } from '@sveltejs/kit';
import { db } from '$lib/modules/database/client';
import { opportunities, activities, notes, attachments } from '$lib/modules/database/schema';
import { desc, eq, like, inArray, sql } from 'drizzle-orm';
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

/**
 * DELETE /api/opportunities
 * Safely removes opportunities and cascades to related entities.
 *
 * Body options:
 *   { "source": "mock" }         — delete all mock-* prefixed IDs
 *   { "source": "ted" }          — delete all ted-* prefixed IDs
 *   { "source": "cf" }           — delete all cf-* prefixed IDs (UK Contracts Finder)
 *   { "titleContains": "Untitled" } — delete by title pattern
 *   { "purgeAll": true }         — delete ALL opportunities (nuclear option)
 *   { "ids": ["id1", "id2"] }    — delete specific IDs
 */
export async function DELETE({ request }: RequestEvent) {
    try {
        const body = await request.json();

        // Determine which records to delete
        let targetIds: string[] = [];

        if (body.ids && Array.isArray(body.ids)) {
            // Delete specific IDs
            targetIds = body.ids;
        } else if (body.source) {
            // Delete by source prefix
            const prefix = `${body.source}-%`;
            const matching = await db.select({ id: opportunities.id })
                .from(opportunities)
                .where(like(opportunities.id, prefix));
            targetIds = matching.map(r => r.id);
        } else if (body.titleContains) {
            // Delete by title pattern
            const pattern = `%${body.titleContains}%`;
            const matching = await db.select({ id: opportunities.id })
                .from(opportunities)
                .where(like(opportunities.title, pattern));
            targetIds = matching.map(r => r.id);
        } else if (body.purgeAll === true) {
            // Delete everything — requires explicit flag
            const all = await db.select({ id: opportunities.id }).from(opportunities);
            targetIds = all.map(r => r.id);
        } else {
            return json({
                success: false,
                error: 'Specify one of: ids, source, titleContains, or purgeAll'
            }, { status: 400 });
        }

        if (targetIds.length === 0) {
            return json({ success: true, deleted: 0, message: 'No matching records found' });
        }

        console.log(`[Cleanup] Deleting ${targetIds.length} opportunities and related entities...`);

        // Cascade: delete related entities first (activities, notes, attachments)
        // These reference opportunities via entityId (soft FK)
        let activitiesDeleted = 0;
        let notesDeleted = 0;
        let attachmentsDeleted = 0;

        // Process in batches to avoid query size limits
        const batchSize = 100;
        for (let i = 0; i < targetIds.length; i += batchSize) {
            const batch = targetIds.slice(i, i + batchSize);

            const actResult = await db.delete(activities)
                .where(inArray(activities.entityId, batch));
            const noteResult = await db.delete(notes)
                .where(inArray(notes.entityId, batch));
            const attachResult = await db.delete(attachments)
                .where(inArray(attachments.entityId, batch));

            // Delete the opportunities themselves
            await db.delete(opportunities)
                .where(inArray(opportunities.id, batch));
        }

        console.log(`[Cleanup] Deleted ${targetIds.length} opportunities`);

        return json({
            success: true,
            deleted: targetIds.length,
            message: `Deleted ${targetIds.length} opportunities and related entities`
        });
    } catch (error: any) {
        console.error('Failed to delete opportunities:', error);
        return json({ success: false, error: 'Failed to delete opportunities' }, { status: 500 });
    }
}
