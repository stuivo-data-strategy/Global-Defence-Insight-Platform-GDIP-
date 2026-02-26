import type { PageLoad } from './$types';
import type { Event } from '$lib/modules/harvesters/types';

export const load: PageLoad = async ({ fetch }) => {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }
        const result = await response.json();

        return {
            events: result.data as Event[]
        };
    } catch (e) {
        console.error('Error loading events:', e);
        return {
            events: []
        };
    }
};
