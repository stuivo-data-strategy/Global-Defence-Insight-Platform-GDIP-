import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { users, userWorkspaces } from '../database/schema';
import db from '../database/client';

// NOTE: in a real application, you would configure the db connection properly
// This is a stub for the architecture.

// @ts-ignore
const adapter = new DrizzlePostgreSQLAdapter(db, null as any, users);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV === 'production'
        }
    },
    getUserAttributes: (attributes) => {
        return {
            email: attributes.email,
            role: attributes.role,
            defaultWorkspaceId: attributes.defaultWorkspaceId
        };
    }
});

declare module 'lucia' {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
    }
}

interface DatabaseUserAttributes {
    email: string;
    role: string;
    defaultWorkspaceId: string;
}
