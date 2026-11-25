// Typed client for the FastAPI backend (apps/backend, mounted at /api/v1).

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

const TOKEN_KEY = 'ci_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Turn FastAPI's `detail` (a string, or a list of validation errors) into one readable message. */
function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = d.loc?.filter((p) => p !== 'body').join('.');
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  if (status === 0) return 'Cannot reach the backend. Is it running on ' + API_URL + '?';
  return `Request failed (${status})`;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  json?: unknown;
  form?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
};

export async function api<T>(path: string, { method = 'GET', json, form, query }: RequestOptions = {}): Promise<T> {
  const url = new URL(API_URL + path);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = new URLSearchParams(form);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body });
  } catch {
    throw new ApiError(0, errorMessage(0, null));
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      // Expired or invalid token: drop it so the app sends the user back to sign in.
      setToken(null);
      window.dispatchEvent(new Event('ci:logout'));
    }
    throw new ApiError(res.status, errorMessage(res.status, data));
  }
  return data as T;
}

// ---- Types (mirror the backend's Pydantic response models) ----

export const PLATFORMS = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TWITTER: 'Twitter / X',
  LINKEDIN: 'LinkedIn',
};

export const CREATIVE_FORMATS = [
  'STICKMAN', 'DOODLE', 'WHITEBOARD', 'CARTOON', 'MOTION_GRAPHICS', 'CINEMATIC', 'DOCUMENTARY', 'EDUCATIONAL',
] as const;
export type CreativeFormat = (typeof CREATIVE_FORMATS)[number];

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  niche: string | null;
  target_audience: string | null;
  language: string;
  country: string;
  platforms: Platform[];
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  title: string;
  description?: string;
  niche?: string;
  target_audience?: string;
  platforms?: Platform[];
}

export interface Strategy {
  strategy_id: string;
  concept: string;
  topic: string;
  target_audience: string;
  creative_angle: string;
  core_message: string;
  emotional_objective: string;
  hook_direction: string;
  narrative_formula: string;
  visual_style: string;
  animation_style: string;
  duration: number;
  platform_adaptations: Record<string, unknown>;
  differentiation: string;
  alternatives: Record<string, unknown>;
  is_approved: boolean;
  approved_at: string | null;
  approval_feedback: string | null;
  created_at: string;
}

export interface StrategyCreate {
  concept: string;
  topic: string;
  target_audience: string;
  platform_targets: string[];
  duration_preference: number;
  tone: string;
  format_preference: string;
}

export interface Production {
  id: string;
  project_id: string;
  strategy_id: string;
  format: CreativeFormat;
  script: Record<string, unknown>;
  hooks: Record<string, unknown>;
  voiceover: Record<string, unknown>;
  storyboard: Record<string, unknown>;
  character_designs: Record<string, unknown>;
  animation_instructions: Record<string, unknown>;
  visual_prompts: Record<string, unknown>;
  image_assets: Record<string, unknown>;
  video_assets: Record<string, unknown>;
  sound_design: Record<string, unknown>;
  music_direction: Record<string, unknown>;
  editing_instructions: Record<string, unknown>;
  captions: Record<string, unknown>;
  subtitles: Record<string, unknown>;
  timeline: Record<string, unknown>;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Page {
  total: number;
  page: number;
  page_size: number;
}

// ---- Endpoints ----

export const authApi = {
  login: (email: string, password: string) =>
    api<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      form: { username: email, password },
    }),
  register: (email: string, password: string, name?: string) =>
    api<User>('/auth/register', { method: 'POST', json: { email, password, name: name || undefined } }),
  me: () => api<User>('/auth/me'),
};

export const projectsApi = {
  list: () => api<Page & { projects: Project[] }>('/projects', { query: { page_size: 100 } }),
  create: (data: ProjectCreate) => api<Project>('/projects', { method: 'POST', json: data }),
  update: (id: string, data: Partial<ProjectCreate & { language: string; country: string }>) =>
    api<Project>(`/projects/${id}`, { method: 'PATCH', json: data }),
  remove: (id: string) => api<void>(`/projects/${id}`, { method: 'DELETE' }),
};

export const strategiesApi = {
  list: (projectId: string) =>
    api<Page & { strategies: Strategy[] }>(`/strategies/${projectId}/strategies`, { query: { page_size: 100 } }),
  create: (projectId: string, data: StrategyCreate) =>
    api<Strategy>(`/strategies/${projectId}/strategies`, { method: 'POST', json: data }),
  approve: (projectId: string, strategyId: string, approved: boolean, feedback?: string) =>
    api<Strategy>(`/strategies/${projectId}/strategies/${strategyId}/approve`, {
      method: 'PATCH',
      json: { approved, feedback: feedback || undefined },
    }),
  remove: (projectId: string, strategyId: string) =>
    api<void>(`/strategies/${projectId}/strategies/${strategyId}`, { method: 'DELETE' }),
};

export const productionsApi = {
  list: (projectId: string) =>
    api<Page & { productions: Production[] }>(`/productions/${projectId}/productions`, { query: { page_size: 100 } }),
  generate: (projectId: string, strategyId: string, format: CreativeFormat, platformTargets: string[]) =>
    api<Production>(`/productions/${projectId}/productions/generate`, {
      method: 'POST',
      json: { strategy_id: strategyId, format, platform_targets: platformTargets },
    }),
  remove: (projectId: string, productionId: string) =>
    api<void>(`/productions/${projectId}/productions/${productionId}`, { method: 'DELETE' }),
};

// ---- Research → learning modules ----

type Json = Record<string, unknown>;
/** Which path produced AI-backed output: the configured LLM, or the no-key template. */
export type Source = 'ai' | 'template';

export interface VideoSummary {
  url: string;
  title: string;
  platform?: string | null;
  creator?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  engagement_rate?: number | null;
  duration?: number | null;
  thumbnail_url?: string | null;
  published_at?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  topic_description: string;
  target_audience: string;
  audience_need: string;
  market_evidence: Json;
  relevant_trends: Json;
  competing_content: Json;
  reference_videos: Json;
  relevant_creators: Json;
  performance_data: Json;
  creative_formats: CreativeFormat[];
  potential_hooks: Json;
  risks: Json;
  confidence_level: number;
  recommended_actions: Json;
  status: 'DISCOVERED' | 'RESEARCHING' | 'VALIDATED' | 'REJECTED' | 'ARCHIVED';
  rank_scores: Record<string, number>;
  created_at: string;
}

export interface DiscoveryResult {
  opportunities: Opportunity[];
  videos_analyzed: number;
  used_ai: boolean;
  provider: string | null;
  warnings: string[];
}

export interface Reference {
  id: string;
  title: string;
  source_url: string | null;
  source_platform: Platform | null;
  creator_name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  published_at: string | null;
  engagement_metrics: { views?: number; likes?: number; comments?: number; engagement_rate?: number; fetched_at?: string };
  hashtags: string[];
  captions: string | null;
  status: string;
  reference_metadata: { transcript?: { language: string; automatic: boolean; segments: { start: number; text: string }[] } | null };
  error_message: string | null;
  created_at: string;
}

export interface SearchResult {
  url: string;
  title: string;
  platform: string | null;
  creator: string | null;
  views: number | null;
  duration: number | null;
  thumbnail_url: string | null;
  reference_id: string | null;
}

export interface Investigation {
  id: string;
  reference_id: string;
  analysis_type: string;
  findings: Json;
  evidence: { items?: { timestamp?: string; quote?: string }[] };
  interpretations: { text?: string; source?: Source };
  confidence_level: number;
  creative_applications: { items?: string[] };
  created_at: string;
}

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: Json;
  evidence: Json;
  source_type: string;
  source_reference: string | null;
  confidence_level: number;
  is_validated: boolean;
  tags: string[];
  created_at: string;
}

export interface TestVariant {
  label: string;
  content: string;
  rationale?: string;
  predicted_score?: number | null;
}

export interface Test {
  id: string;
  production_id: string | null;
  test_type: string;
  variants: { items?: TestVariant[]; source?: Source };
  results: { winner?: string; notes?: string; metrics?: Json };
  performance_hypothesis: Json;
  audience_experiment: Json;
  status: string;
  created_at: string;
}

export const TEST_TYPES = [
  'HOOK_ALTERNATIVE', 'OPENING_SCENE', 'SCRIPT_ALTERNATIVE', 'VOICEOVER_ALTERNATIVE', 'NARRATIVE_APPROACH',
  'ANIMATION_VARIATION', 'DURATION_COMPARISON', 'VISUAL_CONSISTENCY', 'AUDIO_QUALITY', 'SUBTITLE_VERIFICATION',
] as const;

export const PUBLISH_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export interface Publication {
  id: string;
  production_id: string;
  platform: Platform;
  account_id: string;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  video_url: string;
  scheduled_at: string | null;
  published_at: string | null;
  status: PublishStatus;
  platform_url: string | null;
  created_at: string;
}

export type PublicationInput = Pick<Publication, 'production_id' | 'platform' | 'account_id' | 'title' | 'description' | 'tags' | 'hashtags' | 'video_url'> & {
  scheduled_at?: string | null;
};

export interface PublicationDraft {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  best_posting_time?: string | null;
  thumbnail_text?: string | null;
  source: Source;
  warning?: string | null;
}

export interface Analytics {
  id: string;
  publication_id: string;
  platform: Platform;
  views: number;
  watch_time: number;
  completion_rate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follower_growth: number;
  engagement_rate: number;
  performance_over_time: { snapshots?: { at: string; views: number | null; likes: number | null; comments: number | null }[] };
  predicted_vs_actual: Json;
  successful_elements: { items?: string[] };
  weak_points: { items?: string[] };
  improvement_opps: { items?: string[] };
  collected_at: string;
}

export interface AIStatus {
  active_provider: string | null;
  active_label: string | null;
  model: string | null;
  requested_provider: string | null;
  fallback: boolean;
  fallback_order: string[];
  providers: { name: string; label: string; configured: boolean; env: string; cooling_down: boolean }[];
}

const P = (projectId: string) => `/projects/${projectId}`;
const many = { page_size: 100 };

export const accountApi = {
  update: (data: { name?: string | null; current_password?: string; new_password?: string }) =>
    api<User>('/auth/me', { method: 'PATCH', json: data }),
};

export const systemApi = {
  ai: () => api<AIStatus>('/system/ai'),
  testAi: () => api<AIStatus & { reply: string; latency_ms: number }>('/system/ai/test', { method: 'POST' }),
};

export const opportunitiesApi = {
  list: (projectId: string, origin?: 'discovery' | 'idea') =>
    api<Page & { opportunities: Opportunity[] }>(`/opportunities/${projectId}/opportunities`, { query: { ...many, origin } }),
  setStatus: (projectId: string, id: string, status: Opportunity['status']) =>
    api<Opportunity>(`/opportunities/${projectId}/opportunities/${id}`, { method: 'PATCH', json: { status } }),
  remove: (projectId: string, id: string) => api<void>(`/opportunities/${projectId}/opportunities/${id}`, { method: 'DELETE' }),
  discover: (projectId: string, data: { niche?: string; audience?: string; platforms: string[]; content_types: string[]; max_results: number }) =>
    api<DiscoveryResult>(`${P(projectId)}/discover`, { method: 'POST', json: data }),
  validateIdea: (projectId: string, concept: string, audience?: string) =>
    api<{ opportunity: Opportunity; videos_analyzed: number; used_ai: boolean; warnings: string[] }>(
      `${P(projectId)}/ideas/validate`, { method: 'POST', json: { concept, audience: audience || undefined } }),
};

export const referencesApi = {
  list: (projectId: string) => api<Page & { references: Reference[] }>(`/references/${projectId}/references`, { query: many }),
  remove: (projectId: string, id: string) => api<void>(`/references/${projectId}/references/${id}`, { method: 'DELETE' }),
  search: (projectId: string, q: string, sort: 'relevance' | 'views' | 'date') =>
    api<SearchResult[]>(`${P(projectId)}/research/search`, { query: { q, sort, limit: 12 } }),
  capture: (projectId: string, url: string) => api<Reference>(`${P(projectId)}/references/capture`, { method: 'POST', json: { url } }),
  refresh: (projectId: string, id: string) => api<Reference>(`${P(projectId)}/references/${id}/refresh`, { method: 'POST' }),
};

export const investigationsApi = {
  list: (projectId: string, referenceId?: string) =>
    api<Page & { investigations: Investigation[] }>(`/investigations/${projectId}/investigations`, {
      query: { ...many, reference_id: referenceId },
    }),
  types: (projectId: string) => api<{ type: string; description: string }[]>(`${P(projectId)}/investigation-types`),
  run: (projectId: string, referenceId: string, analysisTypes: string[]) =>
    api<{ investigations: Investigation[]; source: Source; warning?: string | null }>(
      `${P(projectId)}/references/${referenceId}/investigate`, { method: 'POST', json: { analysis_types: analysisTypes } }),
};

export const knowledgeApi = {
  list: (projectId: string, category?: string) =>
    api<Page & { entries: KnowledgeEntry[] }>(`/knowledge/${projectId}/knowledge`, { query: { ...many, category } }),
  create: (projectId: string, data: { category: string; title: string; content: Json; source_type: string; confidence_level: number; tags: string[] }) =>
    api<KnowledgeEntry>(`/knowledge/${projectId}/knowledge`, { method: 'POST', json: data }),
  update: (projectId: string, id: string, data: Partial<Pick<KnowledgeEntry, 'title' | 'category' | 'content' | 'is_validated' | 'tags' | 'confidence_level'>>) =>
    api<KnowledgeEntry>(`/knowledge/${projectId}/knowledge/${id}`, { method: 'PATCH', json: data }),
  remove: (projectId: string, id: string) => api<void>(`/knowledge/${projectId}/knowledge/${id}`, { method: 'DELETE' }),
  analyzeReferences: (projectId: string, referenceIds: string[], title?: string) =>
    api<{ entry: KnowledgeEntry; source: Source; warning?: string | null }>(`${P(projectId)}/intelligence/analyze`, {
      method: 'POST', json: { reference_ids: referenceIds, title: title || undefined },
    }),
};

export const testsApi = {
  list: (projectId: string) => api<Page & { tests: Test[] }>(`/tests/${projectId}/tests`, { query: many }),
  generate: (projectId: string, productionId: string, testType: string, variantCount: number) =>
    api<Test>(`${P(projectId)}/tests/generate`, {
      method: 'POST', json: { production_id: productionId, test_type: testType, variant_count: variantCount },
    }),
  update: (projectId: string, id: string, data: { results?: Test['results']; status?: string }) =>
    api<Test>(`/tests/${projectId}/tests/${id}`, { method: 'PATCH', json: data }),
  remove: (projectId: string, id: string) => api<void>(`/tests/${projectId}/tests/${id}`, { method: 'DELETE' }),
};

export const publicationsApi = {
  list: (projectId: string) => api<Page & { publications: Publication[] }>(`/publications/${projectId}/publications`, { query: many }),
  create: (projectId: string, data: PublicationInput) =>
    api<Publication>(`/publications/${projectId}/publications`, { method: 'POST', json: data }),
  update: (projectId: string, id: string, data: Partial<Publication>) =>
    api<Publication>(`/publications/${projectId}/publications/${id}`, { method: 'PATCH', json: data }),
  remove: (projectId: string, id: string) => api<void>(`/publications/${projectId}/publications/${id}`, { method: 'DELETE' }),
  draft: (projectId: string, productionId: string, platform: Platform) =>
    api<PublicationDraft>(`${P(projectId)}/publications/draft`, { method: 'POST', json: { production_id: productionId, platform } }),
};

export const analyticsApi = {
  list: (projectId: string) => api<Page & { analytics: Analytics[] }>(`/analytics/${projectId}/analytics`, { query: many }),
  create: (projectId: string, data: Partial<Analytics> & { publication_id: string; platform: Platform }) =>
    api<Analytics>(`/analytics/${projectId}/analytics`, { method: 'POST', json: data }),
  update: (projectId: string, id: string, data: Partial<Analytics>) =>
    api<Analytics>(`/analytics/${projectId}/analytics/${id}`, { method: 'PATCH', json: data }),
  remove: (projectId: string, id: string) => api<void>(`/analytics/${projectId}/analytics/${id}`, { method: 'DELETE' }),
  fetch: (projectId: string, publicationId: string) =>
    api<Analytics>(`${P(projectId)}/analytics/fetch`, { method: 'POST', json: { publication_id: publicationId } }),
  insights: (projectId: string, id: string) =>
    api<{ analytics: Analytics; learnings_saved: number; source: Source; warning?: string | null }>(
      `${P(projectId)}/analytics/${id}/insights`, { method: 'POST' }),
};

/** 1234567 -> "1.2M" */
export function compactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '–';
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** 754 -> "12:34" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return '–';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

const ACRONYMS: Record<string, string> = { cta: 'CTA', ctas: 'CTAs', ocr: 'OCR', ai: 'AI', dna: 'DNA' };

/** "MOTION_GRAPHICS" -> "Motion Graphics", "CTAS" -> "CTAs" */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
