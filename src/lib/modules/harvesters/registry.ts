import type { Harvester, HarvesterMetadata, RawData, Opportunity, Event } from './types';

export class HarvesterRegistry {
    private harvesters: Map<string, Harvester> = new Map();

    /**
     * Register a new harvester instance
     */
    register(harvester: Harvester): void {
        const metadata = harvester.identify();
        if (this.harvesters.has(metadata.id)) {
            console.warn(`Harvester with ID ${metadata.id} is already registered. Overwriting.`);
        }
        this.harvesters.set(metadata.id, harvester);
        console.log(`Registered harvester: ${metadata.name} (${metadata.id})`);
    }

    /**
     * Get all registered harvesters
     */
    getAll(): Harvester[] {
        return Array.from(this.harvesters.values());
    }

    /**
     * Get metadata for all registered harvesters
     */
    public getMetadata(): HarvesterMetadata[] {
        return this.getAll().map(h => h.identify());
    }

    /**
     * Run all harvesters and return normalized data
     */
    async runAll(params: Record<string, any> = {}): Promise<{ opportunities: Opportunity[], events: Event[] }> {
        const opportunities: Opportunity[] = [];
        const events: Event[] = [];

        const allHarvesters = this.getAll();

        // Run harvesters concurrently
        const harvestPromises = allHarvesters.map(async (harvester) => {
            try {
                const metadata = harvester.identify();
                console.log(`[Harvester] Running ${metadata.name}...`);

                const rawItems: RawData[] = await harvester.fetch(params);

                // Normalize each raw item
                rawItems.forEach(raw => {
                    try {
                        const normalized = harvester.normalise(raw);
                        // Type narrowing based on inferred properties
                        if ('noticeType' in normalized) {
                            opportunities.push(normalized as Opportunity);
                        } else if ('eventType' in normalized) {
                            events.push(normalized as Event);
                        }
                    } catch (e) {
                        console.error(`[Harvester] Error normalising item ${raw.id} from ${metadata.name}:`, e);
                    }
                });

            } catch (error) {
                console.error(`[Harvester] Error running harvester: `, error);
            }
        });

        await Promise.allSettled(harvestPromises);

        return { opportunities, events };
    }
}

// Export a singleton instance
export const harvesterRegistry = new HarvesterRegistry();
