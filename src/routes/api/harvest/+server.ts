import { json } from '@sveltejs/kit';
import { harvesterRegistry } from '$lib/modules/harvesters/registry';
import { MockHarvester } from '$lib/modules/harvesters/mock/MockHarvester';
import { TedHarvester } from '$lib/modules/harvesters/ted/TedHarvester';
import { SamGovHarvester } from '$lib/modules/harvesters/sam/SamGovHarvester';
import { ContractsFinderHarvester } from '$lib/modules/harvesters/contractsfinder/ContractsFinderHarvester';
import { NspaHarvester } from '$lib/modules/harvesters/nspa/NspaHarvester';
import { AusTenderHarvester } from '$lib/modules/harvesters/austender/AusTenderHarvester';
import { CanadaBuysHarvester } from '$lib/modules/harvesters/canadabuys/CanadaBuysHarvester';
import { db } from '$lib/modules/database/client';
import { opportunities, events, workspaces } from '$lib/modules/database/schema';

// Auto-register all harvesters
harvesterRegistry.register(new MockHarvester());
harvesterRegistry.register(new TedHarvester());
harvesterRegistry.register(new SamGovHarvester());
harvesterRegistry.register(new ContractsFinderHarvester());
harvesterRegistry.register(new NspaHarvester());
harvesterRegistry.register(new AusTenderHarvester());
harvesterRegistry.register(new CanadaBuysHarvester());

import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json().catch(() => ({}));

        // Pass optional params like count to the harvester
        const count = body.count || 10;
        const source = body.source || 'all'; // 'mock', 'ted', or 'all'

        // Run selected harvesters
        let results;
        if (source === 'all') {
            results = await harvesterRegistry.runAll({ count });
        } else {
            // Run only the specified harvester
            results = await harvesterRegistry.runOne(source, { count, limit: count });
        }

        // Get default workspace to assign ownership
        const defaultWorkspace = await db.query.workspaces.findFirst();
        if (!defaultWorkspace) {
            throw new Error("No workspace found. Please run the seed script.");
        }

        // Insert opportunities into DB
        if (results.opportunities.length > 0) {
            const oppsToInsert = results.opportunities.map(o => ({
                workspaceId: defaultWorkspace.id,
                title: o.title,
                description: o.description,
                sourceUrl: o.sourceUrl,
                publishedAt: o.publishedAt ? new Date(o.publishedAt) : undefined,
                deadlineAt: o.deadlineAt ? new Date(o.deadlineAt) : undefined,
                noticeType: o.noticeType,
                valueExt: o.valueExt,
                valueCurrency: o.valueCurrency,
                country: o.country,
                region: o.region,
                organisation: o.organisation,
                domain: o.domain,
                keywords: o.keywords,
                workflowStage: 'New'
            }));
            await db.insert(opportunities).values(oppsToInsert);
        }

        // Insert events into DB
        if (results.events.length > 0) {
            const eventsToInsert = results.events.map(e => ({
                workspaceId: defaultWorkspace.id,
                name: e.name,
                description: e.description,
                startDate: new Date(e.startDate),
                endDate: new Date(e.endDate),
                location: e.location,
                eventType: e.eventType,
                websiteUrl: e.websiteUrl
            }));
            await db.insert(events).values(eventsToInsert);
        }

        // Return the harvested and normalized data
        return json({
            success: true,
            summary: {
                opportunitiesHarvested: results.opportunities.length,
                eventsHarvested: results.events.length,
                total: results.opportunities.length + results.events.length
            },
            data: results
        });
    } catch (error: any) {
        console.error('Error during harvest:', error);
        return json({ success: false, error: error.message || 'Unknown harvesting error' }, { status: 500 });
    }
}

export async function GET() {
    // Return list of available harvesters
    return json({
        harvesters: harvesterRegistry.getMetadata()
    });
}
