import React from 'react';
import { cn } from '@/lib/utils';

/** "hook_direction" / "hookDirection" -> "Hook direction" */
function label(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase()
    .replace(/\b(dna|cta|ai|ocr)\b/g, (w) => w.toUpperCase()).replace(/\bctas\b/g, 'CTAs');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/** Readable rendering of the free-form JSON the generators return (nested objects, lists, scalars). */
export function DataView({ value, className, depth = 0 }: { value: unknown; className?: string; depth?: number }) {
  if (isEmpty(value)) return <span className="text-muted-foreground">—</span>;

  if (Array.isArray(value)) {
    const allScalars = value.every((v) => typeof v !== 'object' || v === null);
    if (allScalars) {
      return (
        <ul className={cn('list-disc space-y-0.5 pl-5', className)}>
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ol className={cn('space-y-1.5', className)}>
        {value.map((v, i) => (
          <li key={i} className="rounded-md border bg-background px-2 py-1.5">
            {isFlatRecord(v) ? <FlatRecord value={v} /> : <DataView value={v} depth={depth + 1} />}
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === 'object') {
    return (
      <dl className={cn('space-y-1.5', depth > 0 && 'pl-3 border-l', className)}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium text-muted-foreground">{label(k)}</dt>
            <dd className="text-sm">
              <DataView value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className={cn('whitespace-pre-wrap', className)}>{String(value)}</span>;
}

function isFlatRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.values(value).every((v) => v === null || typeof v !== 'object')
  );
}

/** A list item like {id: 1, duration: 3, description: "..."} on one line. */
function FlatRecord({ value }: { value: Record<string, unknown> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
      {Object.entries(value).map(([k, v]) => (
        <span key={k}>
          <span className="text-xs text-muted-foreground">{label(k)}: </span>
          {isEmpty(v) ? '—' : String(v)}
        </span>
      ))}
    </div>
  );
}
