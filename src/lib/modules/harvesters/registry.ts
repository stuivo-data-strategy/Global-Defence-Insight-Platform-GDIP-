import type { Harvester, HarvesterMetadata, RawData, Opportunity, Event } from './types';

// Defence keyword matching for filtering harvested events/opportunities
const DEFENCE_KEYWORDS = [
    'defence', 'defense', 'military', 'army', 'navy', 'air force', 'defense expo', 'defence expo', 'defence conference', 'defense conference', 'military symposium', 'defence summit', 'security', 'homeland'
];

function matchesDefenceText(text?: string): boolean {
    if (!text) return false;
    const lc = text.toLowerCase();
    return DEFENCE_KEYWORDS.some(k => lc.includes(k));
}

function isDefenceEvent(ev: any): boolean {
    // Check common fields: name, description, eventType
    if (!ev) return false;
    if (matchesDefenceText(ev.name)) return true;
    if (matchesDefenceText(ev.description)) return true;
    if (ev.eventType && matchesDefenceText(String(ev.eventType))) return true;
    // fallback: check websiteUrl for defence keywords
    if (matchesDefenceText(ev.websiteUrl)) return true;
    return false;
}

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
                        // If params.defenceOnly is set, discard non-defence items
                        const defenceOnly = params?.defenceOnly === true;

                        // Type narrowing based on inferred properties
                        if ('noticeType' in normalized) {
                            if (!defenceOnly || matchesDefenceText((normalized as Opportunity).title || (normalized as Opportunity).description)) {
                                opportunities.push(normalized as Opportunity);
                            }
                        } else if ('eventType' in normalized) {
                            if (!defenceOnly || isDefenceEvent(normalized)) {
                                events.push(normalized as Event);
                            }
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

    /**
     * Run a single harvester by name/id substring
     */
    async runOne(source: string, params: Record<string, any> = {}): Promise<{ opportunities: Opportunity[], events: Event[] }> {
        const opportunities: Opportunity[] = [];
        const events: Event[] = [];

        const harvester = this.getAll().find(h => h.identify().id.includes(source));
        if (!harvester) {
            console.warn(`[Registry] No harvester found matching "${source}"`);
            return { opportunities, events };
        }

        const metadata = harvester.identify();
        console.log(`[Harvester] Running ${metadata.name}...`);

        const rawItems: RawData[] = await harvester.fetch(params);
        rawItems.forEach(raw => {
            try {
                const normalized = harvester.normalise(raw);
                const defenceOnly = params?.defenceOnly === true;
                if ('noticeType' in normalized) {
                    if (!defenceOnly || matchesDefenceText((normalized as Opportunity).title || (normalized as Opportunity).description)) {
                        opportunities.push(normalized as Opportunity);
                    }
                } else if ('eventType' in normalized) {
                    if (!defenceOnly || isDefenceEvent(normalized)) {
                        events.push(normalized as Event);
                    }
                }
            } catch (e) {
                console.error(`[Harvester] Error normalising item ${raw.id}:`, e);
            }
        });

        return { opportunities, events };
    }
}

// Export a singleton instance
export const harvesterRegistry = new HarvesterRegistry();
