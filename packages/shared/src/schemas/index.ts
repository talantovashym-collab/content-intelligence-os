// Shared Zod schemas

import { z } from 'zod';

// Auth schemas
export const UserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const TokenSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
});

// Project schemas
export const ProjectCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  niche: z.string().optional(),
  target_audience: z.string().optional(),
  language: z.string().default('en'),
  country: z.string().default('US'),
  platforms: z.array(z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN'])).default(['YOUTUBE']),
});

export const ProjectUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  niche: z.string().optional(),
  target_audience: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  platforms: z.array(z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN'])).optional(),
  stage: z.enum(['IDEA', 'RESEARCH', 'REFERENCE_COLLECTION', 'INVESTIGATION', 'CREATIVE_STRATEGY', 'PRODUCTION', 'TESTING', 'PUBLISHING', 'PUBLISHED', 'ANALYSIS', 'COMPLETED']).optional(),
});

// Opportunity Discovery schemas
export const DiscoveryRequestSchema = z.object({
  niche: z.string().optional(),
  audience: z.string().optional(),
  language: z.string().default('en'),
  country: z.string().default('US'),
  platforms: z.array(z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN'])).default(['YOUTUBE']),
  date_range_days: z.number().int().positive().default(30),
  content_types: z.array(z.enum(['STICKMAN', 'DOODLE', 'WHITEBOARD', 'CARTOON', 'MOTION_GRAPHICS', 'CINEMATIC', 'DOCUMENTARY', 'EDUCATIONAL'])).default([]),
  creator_size_min: z.number().int().positive().optional(),
  creator_size_max: z.number().int().positive().optional(),
  min_engagement_rate: z.number().min(0).max(1).default(0.02),
  max_results: z.number().int().positive().default(20),
  include_competitor_analysis: z.boolean().default(true),
  include_trend_analysis: z.boolean().default(true),
});

// Reference schemas
export const ReferenceCreateSchema = z.object({
  source_url: z.string().url().optional(),
  source_platform: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN']).optional(),
  creator_id: z.string().optional(),
  creator_name: z.string().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  media_type: z.enum(['VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT']),
  media_url: z.string().url().optional(),
  local_path: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  duration: z.number().positive().optional(),
  published_at: z.string().datetime().optional(),
  engagement_metrics: z.record(z.unknown()).default({}),
  hashtags: z.array(z.string()).default([]),
  captions: z.string().optional(),
});

// Investigation schemas
export const InvestigationCreateSchema = z.object({
  reference_id: z.string().uuid(),
  analysis_type: z.enum([
    'SCENE', 'FRAME', 'COMPOSITION', 'CAMERA', 'VISUAL_HIERARCHY', 'COLOR_LIGHTING',
    'OBJECTS_CHARACTERS', 'EXPRESSIONS', 'TRANSITIONS', 'VISUAL_EFFECTS',
    'OCR', 'HEADLINES', 'CAPTIONS', 'SUBTITLES', 'ANIMATED_TYPOGRAPHY', 'TEXT_POSITION',
    'SPEECH_TRANSCRIPTION', 'VOICEOVER', 'DIALOGUE', 'SPEAKER_IDENTIFICATION',
    'SPEECH_SPEED', 'TONE', 'PAUSES', 'MUSIC', 'SOUND_EFFECTS', 'RHYTHM',
    'HOOKS', 'STORYTELLING', 'CURIOSITY_LOOPS', 'EMOTIONAL_TRIGGERS', 'NARRATIVE_STRUCTURE',
    'ANIMATION', 'MOTION_GRAPHICS', 'EDITING', 'TIMING', 'PACING', 'CTAS', 'PAYOFFS'
  ]),
  findings: z.record(z.unknown()).default({}),
  evidence: z.record(z.unknown()).default({}),
  interpretations: z.record(z.unknown()).default({}),
  confidence_level: z.number().min(0).max(1),
  creative_applications: z.record(z.unknown()).default({}),
  timestamped_report: z.record(z.unknown()).default({}),
});

// Creative Strategy schemas
export const StrategyCreateSchema = z.object({
  concept: z.string().min(1),
  topic: z.string().min(1).max(500),
  target_audience: z.string().min(1),
  creative_angle: z.string().min(1),
  core_message: z.string().min(1),
  emotional_objective: z.string().min(1),
  hook_direction: z.string().min(1),
  narrative_formula: z.string().min(1),
  visual_style: z.string().min(1),
  animation_style: z.string().min(1),
  duration: z.number().int().positive(),
  platform_adaptations: z.record(z.unknown()).default({}),
  differentiation: z.string().min(1),
  alternatives: z.record(z.unknown()).default({}),
});

// Production schemas
export const ProductionCreateSchema = z.object({
  strategy_id: z.string().uuid(),
  format: z.enum(['STICKMAN', 'DOODLE', 'WHITEBOARD', 'CARTOON', 'MOTION_GRAPHICS', 'CINEMATIC', 'DOCUMENTARY', 'EDUCATIONAL']),
  script: z.record(z.unknown()).default({}),
  hooks: z.record(z.unknown()).default({}),
  voiceover: z.record(z.unknown()).default({}),
  storyboard: z.record(z.unknown()).default({}),
  character_designs: z.record(z.unknown()).default({}),
  animation_instructions: z.record(z.unknown()).default({}),
  visual_prompts: z.record(z.unknown()).default({}),
  image_assets: z.record(z.unknown()).default({}),
  video_assets: z.record(z.unknown()).default({}),
  sound_design: z.record(z.unknown()).default({}),
  music_direction: z.record(z.unknown()).default({}),
  editing_instructions: z.record(z.unknown()).default({}),
  captions: z.record(z.unknown()).default({}),
  subtitles: z.record(z.unknown()).default({}),
  timeline: z.record(z.unknown()).default({}),
});

// Test schemas
export const TestCreateSchema = z.object({
  production_id: z.string().uuid().optional(),
  test_type: z.enum([
    'HOOK_ALTERNATIVE', 'OPENING_SCENE', 'SCRIPT_ALTERNATIVE', 'VOICEOVER_ALTERNATIVE',
    'NARRATIVE_APPROACH', 'ANIMATION_VARIATION', 'DURATION_COMPARISON',
    'VISUAL_CONSISTENCY', 'AUDIO_QUALITY', 'SUBTITLE_VERIFICATION'
  ]),
  variants: z.record(z.unknown()).default({}),
  results: z.record(z.unknown()).default({}),
  quality_assessment: z.record(z.unknown()).default({}),
  performance_hypothesis: z.record(z.unknown()).default({}),
  audience_experiment: z.record(z.unknown()).default({}),
});

// Publication schemas
export const PublicationCreateSchema = z.object({
  production_id: z.string().uuid(),
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN']),
  account_id: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  cover_image_url: z.string().url().optional(),
  video_url: z.string().url().min(1),
  scheduled_at: z.string().datetime().optional(),
});

// Analytics schemas
export const AnalyticsCreateSchema = z.object({
  publication_id: z.string().uuid(),
  platform: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN']),
  views: z.number().int().nonnegative().default(0),
  watch_time: z.number().int().nonnegative().default(0),
  retention: z.record(z.unknown()).default({}),
  completion_rate: z.number().min(0).max(1).default(0),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
  saves: z.number().int().nonnegative().default(0),
  follower_growth: z.number().int().nonnegative().default(0),
  engagement_rate: z.number().min(0).max(1).default(0),
  performance_over_time: z.record(z.unknown()).default({}),
  predicted_vs_actual: z.record(z.unknown()).default({}),
  successful_elements: z.record(z.unknown()).default({}),
  weak_points: z.record(z.unknown()).default({}),
  improvement_opps: z.record(z.unknown()).default({}),
  cross_platform_compare: z.record(z.unknown()).default({}),
});

// Knowledge Base schemas
export const KnowledgeEntryCreateSchema = z.object({
  category: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  content: z.record(z.unknown()).default({}),
  evidence: z.record(z.unknown()).default({}),
  source_type: z.string().min(1).max(100),
  source_reference: z.string().max(1000).optional(),
  confidence_level: z.number().min(0).max(1),
  tags: z.array(z.string()).default([]),
});

// Pagination schemas
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(20),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  });