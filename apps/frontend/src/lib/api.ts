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

/** "MOTION_GRAPHICS" -> "Motion Graphics" */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
