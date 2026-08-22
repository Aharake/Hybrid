import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 requires an explicit driver adapter — PrismaClient no longer reads
// DATABASE_URL implicitly from the schema file (see prisma.config.ts, which
// only Migrate uses; the adapter below is what the running app connects with).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard singleton pattern — avoids exhausting Postgres connections from
// hot-reload creating a new PrismaClient per file change in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
