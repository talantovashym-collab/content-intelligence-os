// Shared constants

// App metadata
export const APP_NAME = 'Content Intelligence OS';
export const APP_VERSION = '0.1.0';
export const API_V1_PREFIX = '/api/v1';

// Project stages
export const PROJECT_STAGES = [
  'IDEA',
  'RESEARCH',
  'REFERENCE_COLLECTION',
  'INVESTIGATION',
  'CREATIVE_STRATEGY',
  'PRODUCTION',
  'TESTING',
  'PUBLISHING',
  'PUBLISHED',
  'ANALYSIS',
  'COMPLETED',
] as const;

export type ProjectStage = typeof PROJECT_STAGES[number];

// Opportunity statuses
export const OPPORTUNITY_STATUSES = [
  'DISCOVERED',
  'RESEARCHING',
  'VALIDATED',
  'REJECTED',
  'ARCHIVED',
] as const;

export type OpportunityStatus = typeof OPPORTUNITY_STATUSES[number];

// Reference statuses
export const REFERENCE_STATUSES = [
  'PENDING',
  'DOWNLOADING',
  'DOWNLOADED',
  'INDEXING',
  'INDEXED',
  'ANALYZING',
  'ANALYZED',
  'FAILED',
  'ARCHIVED',
] as const;

export type ReferenceStatus = typeof REFERENCE_STATUSES[number];

// Media types
export const MEDIA_TYPES = [
  'VIDEO',
  'AUDIO',
  'IMAGE',
  'DOCUMENT',
] as const;

export type MediaType = typeof MEDIA_TYPES[number];

// Creative formats
export const CREATIVE_FORMATS = [
  'STICKMAN',
  'DOODLE',
  'WHITEBOARD',
  'CARTOON',
  'MOTION_GRAPHICS',
  'CINEMATIC',
  'DOCUMENTARY',
  'EDUCATIONAL',
] as const;

export type CreativeFormat = typeof CREATIVE_FORMATS[number];

// Platforms
export const PLATFORMS = [
  'YOUTUBE',
  'TIKTOK',
  'INSTAGRAM',
  'FACEBOOK',
  'TWITTER',
  'LINKEDIN',
] as const;

export type Platform = typeof PLATFORMS[number];

// Publish statuses
export const PUBLISH_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'ARCHIVED',
] as const;

export type PublishStatus = typeof PUBLISH_STATUSES[number];

// Analysis types
export const ANALYSIS_TYPES = [
  'SCENE',
  'FRAME',
  'COMPOSITION',
  'CAMERA',
  'VISUAL_HIERARCHY',
  'COLOR_LIGHTING',
  'OBJECTS_CHARACTERS',
  'EXPRESSIONS',
  'TRANSITIONS',
  'VISUAL_EFFECTS',
  'OCR',
  'HEADLINES',
  'CAPTIONS',
  'SUBTITLES',
  'ANIMATED_TYPOGRAPHY',
  'TEXT_POSITION',
  'SPEECH_TRANSCRIPTION',
  'VOICEOVER',
  'DIALOGUE',
  'SPEAKER_IDENTIFICATION',
  'SPEECH_SPEED',
  'TONE',
  'PAUSES',
  'MUSIC',
  'SOUND_EFFECTS',
  'RHYTHM',
  'HOOKS',
  'STORYTELLING',
  'CURIOSITY_LOOPS',
  'EMOTIONAL_TRIGGERS',
  'NARRATIVE_STRUCTURE',
  'ANIMATION',
  'MOTION_GRAPHICS',
  'EDITING',
  'TIMING',
  'PACING',
  'CTAS',
  'PAYOFFS',
] as const;

export type AnalysisType = typeof ANALYSIS_TYPES[number];

// Test types
export const TEST_TYPES = [
  'HOOK_ALTERNATIVE',
  'OPENING_SCENE',
  'SCRIPT_ALTERNATIVE',
  'VOICEOVER_ALTERNATIVE',
  'NARRATIVE_APPROACH',
  'ANIMATION_VARIATION',
  'DURATION_COMPARISON',
  'VISUAL_CONSISTENCY',
  'AUDIO_QUALITY',
  'SUBTITLE_VERIFICATION',
] as const;

export type TestType = typeof TEST_TYPES[number];

// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Date formats
export const ISO_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMM d, yyyy h:mm a';

// File size limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

// Supported file types
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword'];

// API rate limits
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;

// JWT
export const JWT_ALGORITHM = 'HS256';
export const JWT_ACCESS_TOKEN_EXPIRY = '7d';
export const JWT_REFRESH_TOKEN_EXPIRY = '30d';

// Redis key prefixes
export const REDIS_KEYS = {
  SESSION: 'session:',
  RATE_LIMIT: 'ratelimit:',
  CACHE: 'cache:',
  JOB: 'job:',
  LOCK: 'lock:',
} as const;

// Celery task names
export const CELERY_TASKS = {
  DISCOVERY: 'app.workers.tasks.discovery.run_discovery_for_project',
  SCHEDULED_DISCOVERY: 'app.workers.tasks.discovery.run_scheduled_discovery',
  PROCESS_VIDEO: 'app.workers.tasks.media_processing.process_video',
  EXTRACT_FRAMES: 'app.workers.tasks.media_processing.extract_frames',
  TRANSCRIBE_AUDIO: 'app.workers.tasks.media_processing.transcribe_audio',
  DETECT_SCENES: 'app.workers.tasks.media_processing.detect_scenes',
  PROCESS_PUBLICATIONS: 'app.workers.tasks.publishing.process_scheduled_publications',
  PUBLISH_TO_PLATFORM: 'app.workers.tasks.publishing.publish_to_platform',
  SYNC_ANALYTICS: 'app.workers.tasks.analytics.sync_platform_analytics',
  GENERATE_REPORT: 'app.workers.tasks.analytics.generate_performance_report',
} as const;

// Default values
export const DEFAULTS = {
  LANGUAGE: 'en',
  COUNTRY: 'US',
  PLATFORM: 'YOUTUBE',
  DATE_RANGE_DAYS: 30,
  MIN_ENGAGEMENT_RATE: 0.02,
  MAX_RESULTS: 20,
  CONFIDENCE_THRESHOLD: 0.7,
} as const;

// Regex patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  YOUTUBE_URL: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
  TIKTOK_URL: /^(https?:\/\/)?(www\.)?tiktok\.com\/@.+\/video\/\d+$/,
  INSTAGRAM_URL: /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/,
} as const;