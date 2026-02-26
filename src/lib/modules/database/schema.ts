import {
    pgTable,
    text,
    timestamp,
    uuid,
    integer,
    jsonb,
    boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Common base columns for multi-tenant and audit
const baseColumns = {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
};

export const workspaces = pgTable('workspaces', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique().notNull(),
    hashedPassword: text('hashed_password'),
    role: text('role').notNull().default('user'),
    defaultWorkspaceId: uuid('default_workspace_id').references(() => workspaces.id)
});

export const userWorkspaces = pgTable('user_workspaces', {
    userId: uuid('user_id').references(() => users.id).notNull(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
    role: text('role').notNull().default('member') // admin, member, viewer
});

export const harvesters = pgTable('harvesters', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    description: text('description'),
    status: text('status').default('unknown').notNull(),
    capabilities: jsonb('capabilities').notNull().default([]), // array of strings
    lastRunAt: timestamp('last_run_at')
});

export const opportunities = pgTable('opportunities', {
    ...baseColumns,
    title: text('title').notNull(),
    description: text('description').notNull(),
    sourceUrl: text('source_url'),
    publishedAt: timestamp('published_at'),
    deadlineAt: timestamp('deadline_at'),
    noticeType: text('notice_type').notNull(),
    valueExt: integer('value_ext'),
    valueCurrency: text('value_currency'),
    country: text('country'),
    region: text('region'),
    organisation: text('organisation'),
    domain: text('domain'), // air, land, sea, cyber, space, multi
    keywords: jsonb('keywords').default([]), // array of strings
    workflowStage: text('workflow_stage').notNull().default('New'),
    score: integer('score').default(0)
});

export const events = pgTable('events', {
    ...baseColumns,
    name: text('name').notNull(),
    description: text('description').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    location: text('location'),
    eventType: text('event_type').notNull(), // expo, conference, trade_show, innovation, other
    websiteUrl: text('website_url')
});

export const notes = pgTable('notes', {
    ...baseColumns,
    entityId: uuid('entity_id').notNull(), // ID of Opportunity or Event
    entityType: text('entity_type').notNull(), // 'opportunity' or 'event'
    authorId: uuid('author_id').references(() => users.id).notNull(),
    content: text('content').notNull()
});

export const attachments = pgTable('attachments', {
    ...baseColumns,
    entityId: uuid('entity_id').notNull(),
    entityType: text('entity_type').notNull(),
    uploaderId: uuid('author_id').references(() => users.id).notNull(),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    sizeBytes: integer('size_bytes')
});

// Relations definitions
export const usersRelations = relations(users, ({ many, one }) => ({
    workspaces: many(userWorkspaces),
    defaultWorkspace: one(workspaces, {
        fields: [users.defaultWorkspaceId],
        references: [workspaces.id]
    })
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
    members: many(userWorkspaces)
}));

export const notesRelations = relations(notes, ({ one }) => ({
    author: one(users, { fields: [notes.authorId], references: [users.id] })
}));
