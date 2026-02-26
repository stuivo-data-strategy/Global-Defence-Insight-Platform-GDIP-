import { type HarvesterMetadata, type Opportunity, type Event } from '../harvesters/types';

export type AgentActionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentContext {
    workspaceId: string;
    userId: string;
    permissions: string[];
}

export interface AgentAction {
    id: string;
    name: string;
    description: string;
    status: AgentActionStatus;
    startedAt?: Date;
    completedAt?: Date;
    result?: any;
    error?: string;
}

export interface AgentToolParams {
    harvesterId?: string;
    query?: string;
    filters?: Record<string, any>;
    targetEntityId?: string;
    enrichmentData?: any;
}

export interface AgenticHooks {
    onHarvestStart: (harvesterId: string, context: AgentContext) => void;
    onHarvestComplete: (harvesterId: string, items: (Opportunity | Event)[], context: AgentContext) => void;
    onOpportunityCreated: (opportunity: Opportunity, context: AgentContext) => void;
    onWorkflowStageChange: (opportunityId: string, oldStage: string, newStage: string, context: AgentContext) => void;
    triggerEnrichment: (opportunityId: string, context: AgentContext) => Promise<boolean>;
    triggerDeduplication: (opportunityId: string, context: AgentContext) => Promise<string[]>; // Returns array of duplicate IDs
}

export interface ExtensibleAgent {
    id: string;
    name: string;
    capabilities: string[];
    executeAction(action: string, params: AgentToolParams, context: AgentContext): Promise<AgentAction>;
    getStatus(): 'idle' | 'busy' | 'offline';
}
