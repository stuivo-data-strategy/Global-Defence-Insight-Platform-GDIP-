import { json } from '@sveltejs/kit';
import { harvesterRegistry } from '$lib/modules/harvesters/registry';
import { MockHarvester } from '$lib/modules/harvesters/mock/MockHarvester';

// Ensure the mock harvester is registered
if (harvesterRegistry.getAll().length === 0) {
    harvesterRegistry.register(new MockHarvester());
}

export async function GET() {
    // Generate mock data dynamically for the list
    const results = await harvesterRegistry.runAll({ count: 5 });

    return json({
        data: results.opportunities
    });
}

export async function POST({ request }) {
    const data = await request.json();
    // ... Handle normalisation and insertion
    return json({ success: true, id: 'new-id' }, { status: 201 });
}
