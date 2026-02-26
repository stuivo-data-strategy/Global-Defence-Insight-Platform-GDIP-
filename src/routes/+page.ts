import type { PageLoad } from './$types';
import type { Opportunity } from '$lib/modules/harvesters/types';

export const load: PageLoad = async ({ fetch }) => {
    try {
        const response = await fetch('/api/opportunities');
        if (!response.ok) {
            throw new Error('Failed to fetch opportunities');
        }
        const result = await response.json();

        return {
            opportunities: result.data as Opportunity[]
        };
    } catch (e) {
        console.error('Error loading opportunities:', e);
        return {
            opportunities: []
        };
    }
};
