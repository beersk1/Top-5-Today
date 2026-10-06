// Small building blocks reused across pages.

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CircleHelp, ListOrdered, Moon, Sparkles, Sun } from 'lucide-react';
import type { LeaderboardEntry } from '../../shared/types';

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const THEME_KEY = 'top5-theme';

function savedTheme(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false;
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(savedTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // Ignore: theme just won't be remembered.
    }
  }, [dark]);
  return (
    <Button
      aria-label="Toggle color theme"
      onClick={() => setDark(!dark)}
      className="h-10 w-10 rounded-full border border-border bg-card text-foreground hover:bg-muted"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </Button>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${inverse ? 'bg-[#f5cc4e] text-[#202633]' : 'bg-primary text-primary-foreground'}`}
      >
        <ListOrdered size={21} strokeWidth={2.8} />
      </span>
      <span
        className={`display text-[17px] font-bold tracking-[-.055em] ${inverse ? 'text-[#fffaf0]' : 'text-foreground'}`}
      >
        top five<span className="text-primary">.</span>
      </span>
    </Link>
  );
}

/** A circle with the person's initials. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'T';
  return (
    <span
      aria-label={`${name} avatar`}
      className={`grid shrink-0 place-items-center rounded-full bg-accent text-xs font-extrabold text-accent-foreground ${size === 'sm' ? 'h-7 w-7' : 'h-10 w-10'}`}
    >
      {initials}
    </span>
  );
}

export function LoadError({ retry, message = 'That didn’t load.' }: { retry: () => void; message?: string }) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-8 text-center" role="alert">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
        <CircleHelp size={21} />
      </div>
      <h3 className="display mt-3 text-xl font-bold">{message}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Your picks are safe. Give it another try.</p>
      <Button onClick={retry} className="mt-4 bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        Try again <ArrowRight size={15} />
      </Button>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-9 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <Sparkles size={21} />
      </div>
      <h3 className="display mt-4 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Grey placeholder blocks shown while a page loads. */
export function LoadingBlocks({ heights }: { heights: string[] }) {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-4">
      {heights.map((height, i) => (
        <div key={i} className={`${height} rounded-[24px] bg-muted`} />
      ))}
    </div>
  );
}

export function LeaderboardRow({
  entry,
  maxPoints,
  index,
}: {
  entry: LeaderboardEntry;
  maxPoints: number;
  index: number;
}) {
  const width = Math.max(3, Math.min(100, (entry.points / maxPoints) * 100));
  return (
    <div className="flex items-center gap-3">
      <span
        className={`mono w-6 text-center text-xs font-medium ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {String(entry.rank).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="truncate text-sm font-bold">{entry.label}</span>
          <span className="mono shrink-0 text-[10px] text-muted-foreground">
            {entry.pickPercent}% · {entry.firstPlaceCount} #1s
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${index === 0 ? 'bg-primary' : 'bg-secondary-foreground/55'}`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="mono w-9 text-right text-xs font-medium">{entry.points}</span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  detail,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="mono text-[10px] uppercase tracking-[.13em]">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="display mt-3 text-4xl font-bold tracking-[-.07em]">
        {value}
        <span className="ml-1 text-sm font-semibold tracking-normal text-muted-foreground">{suffix}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
