// Content Intelligence OS - Database Package
// Re-exports Prisma client and types

import { PrismaClient } from '@prisma/client';

// Global Prisma client instance (singleton pattern)
declare global {
  var prisma: PrismaClient | undefined;
}

const isDevelopment = process.env['NODE_ENV'] === 'development';

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  global.prisma = prisma;
}

export type {
  User,
  Session,
  ApiKey,
  UserPreferences,
  Project,
  ProjectStage,
  Opportunity,
  OpportunityStatus,
  Reference,
  ReferenceStatus,
  MediaType,
  Investigation,
  AnalysisType,
  MultiReferenceAnalysis,
  CreativeStrategy,
  Production,
  CreativeFormat,
  Test,
  TestType,
  Publication,
  PublishStatus,
  Platform,
  Analytics,
  KnowledgeEntry,
  SystemLog,
} from '@prisma/client';

export { PrismaClient } from '@prisma/client';