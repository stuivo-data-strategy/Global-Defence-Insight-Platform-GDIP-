import type {
    Harvester,
    HarvesterMetadata,
    Capability,
    RawData,
    HarvesterStatus,
    Opportunity,
    Event
} from '../types';

export class MockHarvester implements Harvester {
    private readonly metadata: HarvesterMetadata = {
        id: 'mock-harvester-001',
        name: 'GDIP Mock Defense Harvester',
        version: '1.0.0',
        description: 'Generates realistic mock global defense opportunities and events for testing purposes.',
        author: 'GDIP System'
    };

    identify(): HarvesterMetadata {
        return this.metadata;
    }

    capabilities(): Capability[] {
        return ['search', 'list', 'details'];
    }

    async fetch(params: Record<string, any> = {}): Promise<RawData[]> {
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

        const count = params.count || 10;
        const data: RawData[] = [];

        for (let i = 0; i < count; i++) {
            // Mix of Opportunities (80%) and Events (20%)
            const isOpportunity = Math.random() > 0.2;

            data.push({
                id: `raw-mock-${Date.now()}-${i}`,
                source: 'Mock Defense Portal',
                harvestedAt: new Date(),
                rawPayload: isOpportunity ? this.generateMockOpportunityPayload() : this.generateMockEventPayload()
            });
        }

        return data;
    }

    normalise(raw: RawData): Opportunity | Event {
        const payload = raw.rawPayload;

        if (payload.type === 'opportunity') {
            const opp: Opportunity = {
                id: `opp-${raw.id}`,
                workspaceId: 'system-workspace', // Default workspace
                createdAt: new Date(),
                updatedAt: new Date(),
                title: payload.title,
                description: payload.summary,
                sourceUrl: `https://mock-defense-portal.local/tenders/${raw.id}`,
                publishedAt: new Date(payload.publish_date),
                deadlineAt: new Date(payload.close_date),
                noticeType: payload.notice_category,
                valueExt: payload.estimated_value,
                valueCurrency: payload.currency,
                country: payload.location_country,
                region: payload.location_region,
                organisation: payload.issuing_agency,
                domain: this.mapDomain(payload.primary_domain),
                keywords: payload.tags || [],
                workflowStage: 'New'
            };
            return opp;
        } else {
            const evt: Event = {
                id: `evt-${raw.id}`,
                workspaceId: 'system-workspace', // Default workspace
                createdAt: new Date(),
                updatedAt: new Date(),
                name: payload.event_name,
                description: payload.event_description,
                startDate: new Date(payload.start_date),
                endDate: new Date(payload.end_date),
                location: `${payload.venue}, ${payload.city}, ${payload.country}`,
                eventType: this.mapEventType(payload.category),
                websiteUrl: `https://mock-defense-events.local/${raw.id}`
            };
            return evt;
        }
    }

    async healthcheck(): Promise<HarvesterStatus> {
        return 'healthy';
    }

    // --- Helper methods for mock data generation ---

    private generateMockOpportunityPayload(): any {
        const domains = ['air', 'land', 'sea', 'cyber', 'space', 'multi'];
        const agencies = ['Ministry of Defence (UK)', 'Department of Defense (US)', 'NATO Support and Procurement Agency', 'Defense Materiel Organization (NL)', 'Direction Générale de l’Armement (FR)'];
        const categories = ['Tender', 'Request for Information (RFI)', 'Request for Proposal (RFP)', 'Contract Award'];
        const titles = [
            'Next-Gen Tactical Communications Network',
            'Procurement of Unmanned Aerial Systems (UAS)',
            'Cyber Threat Intelligence Platform Subsystem',
            'Naval Radar Modernization Program',
            'Armored Vehicle Active Protection Systems',
            'Space-based Early Warning Satellite Prototype',
            'CBRN Decontamination Equipment',
            'Advanced Infantry Weapons Systems'
        ];

        // Future date between 14 and 90 days from now
        const closeDate = new Date();
        closeDate.setDate(closeDate.getDate() + 14 + Math.floor(Math.random() * 76));

        return {
            type: 'opportunity',
            title: titles[Math.floor(Math.random() * titles.length)],
            summary: 'This is a mocked comprehensive summary of the defense procurement requirement, detailing expected capabilities, delivery timeframes, and compliance standards.',
            publish_date: new Date().toISOString(),
            close_date: closeDate.toISOString(),
            notice_category: categories[Math.floor(Math.random() * categories.length)],
            estimated_value: Math.floor(Math.random() * 50000000) + 1000000,
            currency: 'USD',
            location_country: ['US', 'UK', 'FR', 'NL', 'DE'][Math.floor(Math.random() * 5)],
            location_region: 'Global',
            issuing_agency: agencies[Math.floor(Math.random() * agencies.length)],
            primary_domain: domains[Math.floor(Math.random() * domains.length)],
            tags: ['defense', 'procurement', 'tactical', 'C4ISR']
        };
    }

    private generateMockEventPayload(): any {
        const names = ['Global Defense Expo', 'International Cyber Security Summit', 'Naval Systems Conference', 'Aerospace Innovation Forum', 'Future Land Forces Symposium'];
        const categories = ['expo', 'conference', 'trade_show', 'innovation', 'other'];
        const cities = ['London', 'Washington D.C.', 'Paris', 'Berlin', 'Tokyo'];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 30 + Math.floor(Math.random() * 100)); // 1 to 4 months away

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2 + Math.floor(Math.random() * 3)); // 2 to 4 days long

        return {
            type: 'event',
            event_name: names[Math.floor(Math.random() * names.length)],
            event_description: 'An international gathering of defense industry leaders, military officials, and innovators to discuss future capabilities.',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            venue: 'International Convention Center',
            city: cities[Math.floor(Math.random() * cities.length)],
            country: ['United Kingdom', 'USA', 'France', 'Germany', 'Japan'][Math.floor(Math.random() * 5)],
            category: categories[Math.floor(Math.random() * categories.length)]
        };
    }

    private mapDomain(domain: string): 'air' | 'land' | 'sea' | 'cyber' | 'space' | 'multi' {
        const validDomains = ['air', 'land', 'sea', 'cyber', 'space', 'multi'];
        return validDomains.includes(domain) ? (domain as any) : 'multi';
    }

    private mapEventType(type: string): 'expo' | 'conference' | 'trade_show' | 'innovation' | 'other' {
        const validTypes = ['expo', 'conference', 'trade_show', 'innovation', 'other'];
        return validTypes.includes(type) ? (type as any) : 'other';
    }
}
