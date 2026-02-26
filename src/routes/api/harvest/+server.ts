import { json } from '@sveltejs/kit';
import { harvesterRegistry } from '$lib/modules/harvesters/registry';
import { MockHarvester } from '$lib/modules/harvesters/mock/MockHarvester';

// Auto-register the mock harvester for now
// In the future, this registration would happen at app startup
harvesterRegistry.register(new MockHarvester());

export async function POST({ request }) {
    try {
        const body = await request.json().catch(() => ({}));

        // Pass optional params like count to the harvester
        const count = body.count || 10;

        // Run all registered harvesters
        const results = await harvesterRegistry.runAll({ count });

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
