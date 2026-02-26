export type Capability =
  | 'search'
  | 'list'
  | 'details'
  | 'history'
  | 'subscribe';

export type HarvesterStatus = 'healthy' | 'degraded' | 'offline' | 'unknown';

export interface HarvesterMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
}

export interface RawData {
  id: string;
  source: string;
  rawPayload: any;
  harvestedAt: Date;
}

export interface BaseEntity {
  id: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Opportunity extends BaseEntity {
  title: string;
  description: string;
  sourceUrl?: string;
  publishedAt?: Date;
  deadlineAt?: Date;
  noticeType: string;
  valueExt?: number;
  valueCurrency?: string;
  country?: string;
  region?: string;
  organisation?: string;
  domain?: 'air' | 'land' | 'sea' | 'cyber' | 'space' | 'multi';
  keywords: string[];
  workflowStage: 'New' | 'Review' | 'Pursue' | 'Bid' | 'Closed';
}

export interface Event extends BaseEntity {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  eventType: 'expo' | 'conference' | 'trade_show' | 'innovation' | 'other';
  websiteUrl?: string;
}

export interface Harvester {
  identify(): HarvesterMetadata;
  capabilities(): Capability[];
  fetch(params: Record<string, any>): Promise<RawData[]>;
  normalise(raw: RawData): Opportunity | Event;
  healthcheck(): Promise<HarvesterStatus>;
}
