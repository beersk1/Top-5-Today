// Past days' questions and the picks that won.

import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { useArchive } from '../api';
import { EmptyState, LoadError } from '../components/ui';
import { formatDate } from '../lib/format';

export function ArchivePage() {
  const { data, isLoading, isError, refetch } = useArchive();
  return (
    <div className="page-enter mx-auto max-w-[920px]">
      <div className="mb-8">
        <span className="mono text-xs uppercase tracking-[.16em] text-primary">The back catalog</span>
        <h1 className="display mt-2 text-4xl font-bold tracking-[-.07em] md:text-6xl">Yesterday’s arguments.</h1>
        <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
          Every daily question, plus the picks that won the room. History is a great way to start a new disagreement.
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-[22px] bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <LoadError retry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="The archive is a blank page."
          description="Once a daily topic closes, its crowd favorites land here. Today's list will be the first."
          action={
            <Link href="/" className="font-bold text-primary no-underline">
              Head to today <ArrowRight className="ml-1 inline" size={15} />
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.map(({ topic, topPicks }) => (
            <article key={topic.id} className="lift rounded-[22px] border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                    {formatDate(topic.date)} · {topic.submissionCount.toLocaleString()} lists
                  </span>
                  <h2 className="display mt-2 text-xl font-bold tracking-[-.045em] sm:text-2xl">{topic.title}</h2>
                </div>
                <span className="rounded-full bg-accent/50 px-3 py-1 text-xs font-bold">Top picks</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {topPicks.map((pick, i) => (
                  <span
                    key={pick.entryId}
                    className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-semibold"
                  >
                    <span className="mono text-primary">{i + 1}</span>
                    {pick.label}
                  </span>
                ))}
                {!topPicks.length && <span className="text-xs text-muted-foreground">Nobody played this one.</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
