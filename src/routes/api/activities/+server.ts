import { json } from '@sveltejs/kit';
import { db } from '$lib/modules/database/client';
import { activities } from '$lib/modules/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

// GET: Fetch activities for a specific entity (opportunity or event)
export async function GET({ url }: RequestEvent) {
    try {
        const entityId = url.searchParams.get('entityId');
        const entityType = url.searchParams.get('entityType') || 'opportunity';

        if (!entityId) {
            return json({ error: 'entityId is required' }, { status: 400 });
        }

        const results = await db.query.activities.findMany({
            where: and(
                eq(activities.entityId, entityId),
                eq(activities.entityType, entityType)
            ),
            orderBy: [desc(activities.createdAt)]
        });

        const mapped = results.map(a => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
            dueDate: a.dueDate?.toISOString() || null,
        }));

        return json({ data: mapped });
    } catch (error: any) {
        console.error('Failed to fetch activities:', error);
        return json({ error: 'Failed to fetch activities' }, { status: 500 });
    }
}

// POST: Create a new activity
export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json();

        if (!body.entityId || !body.type || !body.title) {
            return json({ error: 'entityId, type, and title are required' }, { status: 400 });
        }

        const validTypes = ['task', 'meeting', 'milestone', 'call', 'note'];
        if (!validTypes.includes(body.type)) {
            return json({ error: 'Invalid activity type' }, { status: 400 });
        }

        // Use a default workspace and author for now (until auth is wired)
        const defaultWorkspaceId = '00000000-0000-0000-0000-000000000001';

        const [newActivity] = await db.insert(activities).values({
            workspaceId: defaultWorkspaceId,
            entityId: body.entityId,
            entityType: body.entityType || 'opportunity',
            authorId: body.authorId || '00000000-0000-0000-0000-000000000001',
            assignedToId: body.assignedToId || null,
            type: body.type,
            title: body.title,
            description: body.description || null,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            status: body.status || 'pending',
        }).returning();

        return json({
            success: true,
            data: {
                ...newActivity,
                createdAt: newActivity.createdAt.toISOString(),
                updatedAt: newActivity.updatedAt.toISOString(),
                dueDate: newActivity.dueDate?.toISOString() || null,
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create activity:', error);
        return json({ error: 'Failed to create activity' }, { status: 500 });
    }
}
