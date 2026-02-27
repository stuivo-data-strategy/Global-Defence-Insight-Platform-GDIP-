import { json } from '@sveltejs/kit';
import { harvesterRegistry } from '$lib/modules/harvesters/registry';
import { MockHarvester } from '$lib/modules/harvesters/mock/MockHarvester';
import { TedHarvester } from '$lib/modules/harvesters/ted/TedHarvester';
import { SamGovHarvester } from '$lib/modules/harvesters/sam/SamGovHarvester';
import { ContractsFinderHarvester } from '$lib/modules/harvesters/contractsfinder/ContractsFinderHarvester';
import { NspaHarvester } from '$lib/modules/harvesters/nspa/NspaHarvester';
import { AusTenderHarvester } from '$lib/modules/harvesters/austender/AusTenderHarvester';
import { CanadaBuysHarvester } from '$lib/modules/harvesters/canadabuys/CanadaBuysHarvester';
import { EventbriteHarvester } from '$lib/modules/harvesters/eventbrite/EventbriteHarvester';
import { SchemaOrgHarvester } from '$lib/modules/harvesters/schema/SchemaOrgHarvester';
import { MeetupHarvester } from '$lib/modules/harvesters/meetup/MeetupHarvester';
import { TenTimesHarvester } from '$lib/modules/harvesters/tentimes/TenTimesHarvester';
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
// Register Eventbrite harvester (reads token from EVENTBRITE_TOKEN env var)
harvesterRegistry.register(new EventbriteHarvester());
// Register Schema.org JSON-LD harvester for scraping event pages that expose schema.org data
harvesterRegistry.register(new SchemaOrgHarvester());
// Register Meetup and 10times harvesters
harvesterRegistry.register(new MeetupHarvester());
harvesterRegistry.register(new TenTimesHarvester());

import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json().catch(() => ({}));

        // Pass optional params like count to the harvester
        const count = body.count || 10;
        const source = body.source || 'all'; // 'mock', 'ted', or 'all'

        // Run selected harvesters
        let results;
        // Forward the entire request body as params so harvesters can receive URLs, tokens, etc.
        const params = { ...(body || {}), count };
        if (source === 'all') {
            results = await harvesterRegistry.runAll(params);
        } else {
            // Run only the specified harvester
            results = await harvesterRegistry.runOne(source, params);
        }

        // Get default workspace to assign ownership
        const defaultWorkspace = await db.query.workspaces.findFirst();
        if (!defaultWorkspace) {
            throw new Error("No workspace found. Please run the seed script.");
        }

        // Insert opportunities into DB with deduplication by sourceUrl
        if (results.opportunities.length > 0) {
            const oppsToInsertRaw = results.opportunities.map(o => ({
                workspaceId: defaultWorkspace.id,
                title: o.title,
                description: o.description,
                sourceUrl: o.sourceUrl,
                publishedAt: o.publishedAt ? new Date(o.publishedAt) : undefined,
                deadlineAt: o.deadlineAt ? new Date(o.deadlineAt) : undefined,
                noticeType: o.noticeType,
                valueExt: o.valueExt ? Math.round(o.valueExt) : undefined,
                valueCurrency: o.valueCurrency,
                country: o.country,
                region: o.region,
                organisation: o.organisation,
                domain: o.domain,
                keywords: o.keywords,
                workflowStage: 'New'
            }));

            // Dedupe by sourceUrl where available
            const sourceUrls = oppsToInsertRaw
                .map(o => o.sourceUrl)
                .filter((s): s is string => !!s);

            const existingSourceUrls: string[] = [];
            if (sourceUrls.length > 0) {
                const existing = await db.select({ url: opportunities.sourceUrl })
                    .from(opportunities)
                    .where(opportunities.sourceUrl.in(sourceUrls));
                existingSourceUrls.push(...existing.map(e => e.url as string));
            }

            const finalOpps = oppsToInsertRaw.filter(o => {
                if (o.sourceUrl && existingSourceUrls.includes(o.sourceUrl)) {
                    return false; // skip duplicates
                }
                return true;
            });

            if (finalOpps.length > 0) {
                // Insert remaining new opportunities
                await db.insert(opportunities).values(finalOpps);
            }
        }

        // Insert events into DB with deduplication by websiteUrl
        if (results.events.length > 0) {
            const eventsToInsertRaw = results.events.map(e => ({
                workspaceId: defaultWorkspace.id,
                name: e.name,
                description: e.description,
                startDate: new Date(e.startDate),
                endDate: new Date(e.endDate),
                location: e.location,
                eventType: e.eventType,
                websiteUrl: e.websiteUrl
            }));

            if (eventsToInsertRaw.length > 0) {
                try {
                    // Attempt to insert; unique constraints on website_url will prevent duplicates.
                    await db.insert(events).values(eventsToInsertRaw);
                } catch (e) {
                    // Ignore duplicate/constraint errors — some DBs will throw on conflicts.
                    console.warn('Event insert partially failed (duplicates may have been skipped):', e?.message || e);
                }
            }
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
