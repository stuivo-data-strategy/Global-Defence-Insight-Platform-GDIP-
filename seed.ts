import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { workspaces } from './src/lib/modules/database/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is missing in .env');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
    console.log('Seeding default workspace...');
    try {
        const result = await db.insert(workspaces).values({
            name: 'Default Workspace'
        }).returning();

        console.log(`Successfully created workspace with ID: ${result[0].id}`);
    } catch (error) {
        console.error('Error seeding workspace:', error);
    }
    process.exit(0);
}

seed();
