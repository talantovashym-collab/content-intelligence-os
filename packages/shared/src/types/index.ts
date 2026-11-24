// Shared TypeScript types

export interface ProjectStage {
  IDEA: 'IDEA';
  RESEARCH: 'RESEARCH';
  REFERENCE_COLLECTION: 'REFERENCE_COLLECTION';
  INVESTIGATION: 'INVESTIGATION';
  CREATIVE_STRATEGY: 'CREATIVE_STRATEGY';
  PRODUCTION: 'PRODUCTION';
  TESTING: 'TESTING';
  PUBLISHING: 'PUBLISHING';
  PUBLISHED: 'PUBLISHED';
  ANALYSIS: 'ANALYSIS';
  COMPLETED: 'COMPLETED';
}

export type ProjectStageValue = ProjectStage[keyof ProjectStage];

export interface OpportunityStatus {
  DISCOVERED: 'DISCOVERED';
  RESEARCHING: 'RESEARCHING';
  VALIDATED: 'VALIDATED';
  REJECTED: 'REJECTED';
  ARCHIVED: 'ARCHIVED';
}

export type OpportunityStatusValue = OpportunityStatus[keyof OpportunityStatus];

export interface Platform {
  YOUTUBE: 'YOUTUBE';
  TIKTOK: 'TIKTOK';
  INSTAGRAM: 'INSTAGRAM';
  FACEBOOK: 'FACEBOOK';
  TWITTER: 'TWITTER';
  LINKEDIN: 'LINKEDIN';
}

export type PlatformValue = Platform[keyof Platform];

export interface CreativeFormat {
  STICKMAN: 'STICKMAN';
  DOODLE: 'DOODLE';
  WHITEBOARD: 'WHITEBOARD';
  CARTOON: 'CARTOON';
  MOTION_GRAPHICS: 'MOTION_GRAPHICS';
  CINEMATIC: 'CINEMATIC';
  DOCUMENTARY: 'DOCUMENTARY';
  EDUCATIONAL: 'EDUCATIONAL';
}

export type CreativeFormatValue = CreativeFormat[keyof CreativeFormat];

export interface MediaType {
  VIDEO: 'VIDEO';
  AUDIO: 'AUDIO';
  IMAGE: 'IMAGE';
  DOCUMENT: 'DOCUMENT';
}

export type MediaTypeValue = MediaType[keyof MediaType];

export interface ReferenceStatus {
  PENDING: 'PENDING';
  DOWNLOADING: 'DOWNLOADING';
  DOWNLOADED: 'DOWNLOADED';
  INDEXING: 'INDEXING';
  INDEXED: 'INDEXED';
  ANALYZING: 'ANALYZING';
  ANALYZED: 'ANALYZED';
  FAILED: 'FAILED';
  ARCHIVED: 'ARCHIVED';
}

export type ReferenceStatusValue = ReferenceStatus[keyof ReferenceStatus];

export interface PublishStatus {
  DRAFT: 'DRAFT';
  SCHEDULED: 'SCHEDULED';
  PUBLISHING: 'PUBLISHING';
  PUBLISHED: 'PUBLISHED';
  FAILED: 'FAILED';
  ARCHIVED: 'ARCHIVED';
}

export type PublishStatusValue = PublishStatus[keyof PublishStatus];

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  stage: ProjectStageValue;
  niche?: string;
  target_audience?: string;
  language: string;
  country: string;
  platforms: PlatformValue[];
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  project_id: string;
  title: string;
  topic_description: string;
  target_audience: string;
  audience_need: string;
  market_evidence: Record<string, unknown>;
  relevant_trends: Record<string, unknown>;
  competing_content: Record<string, unknown>;
  reference_videos: Record<string, unknown>;
  relevant_creators: Record<string, unknown>;
  performance_data: Record<string, unknown>;
  audience_reactions: Record<string, unknown>;
  creative_formats: CreativeFormatValue[];
  potential_hooks: string[];
  risks: string[];
  confidence_level: number;
  recommended_actions: string[];
  status: OpportunityStatusValue;
  rank_scores: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Reference {
  id: string;
  project_id: string;
  source_url?: string;
  source_platform?: PlatformValue;
  creator_id?: string;
  creator_name?: string;
  title: string;
  description?: string;
  media_type: MediaTypeValue;
  media_url?: string;
  local_path?: string;
  thumbnail_url?: string;
  duration?: number;
  published_at?: string;
  engagement_metrics: Record<string, unknown>;
  hashtags: string[];
  captions?: string;
  status: ReferenceStatusValue;
  metadata: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}