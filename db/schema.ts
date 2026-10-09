import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const journeys = sqliteTable('journeys', { userId:text('user_id').primaryKey(), payload:text('payload').notNull(), updatedAt:integer('updated_at').notNull() });
