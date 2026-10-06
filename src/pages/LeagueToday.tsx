// One league's head-to-head for today's question. Locked until you submit your own list.

import { Link, useRoute } from 'wouter';
import { ArrowLeft, ArrowRight, LockKeyhole, Trophy } from 'lucide-react';
import { useLeagueToday, useToday } from '../api';
import { Avatar, EmptyState, LeaderboardRow, LoadError, LoadingBlocks } from '../components/ui';

function BackLink() {
  return (
    <Link
      href="/leagues"
      className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground no-underline"
    >
      <ArrowLeft size={15} /> Your leagues
    </Link>
  );
}

export function LeagueTodayPage() {
  const [, params] = useRoute('/leagues/:id');
  const leagueId = params?.id ?? '';
  const today = useToday();
  const canCompare = Boolean(today.data?.hasSubmitted);
  const { data, isLoading, isError, refetch } = useLeagueToday(leagueId, Boolean(leagueId) && canCompare);

  if (today.isLoading) return <LoadingBlocks heights={['h-12', 'h-80']} />;

  if (!canCompare) {
    return (
      <div className="page-enter mx-auto max-w-[740px]">
        <BackLink />
        <div className="mt-8 rounded-[26px] border border-border bg-card p-8 text-center sm:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <LockKeyhole size={24} />
          </div>
          <span className="mono mt-5 block text-[10px] uppercase tracking-[.16em] text-primary">
            One rule for everybody
          </span>
          <h1 className="display mt-2 text-3xl font-bold tracking-[-.06em] sm:text-4xl">Make your five first.</h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">
            League picks stay tucked away until you submit your own. Today's topic is{' '}
            <strong className="text-foreground">{today.data?.topic.title ?? 'ready and waiting'}</strong>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground no-underline"
          >
            Make my list <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <LoadingBlocks heights={['h-12', 'h-80']} />;
  if (isError || !data)
    return <LoadError retry={() => refetch()} message={isError ? 'That league didn’t load.' : undefined} />;

  const submitted = data.members.filter((member) => member.submitted);
  const maxPoints = Math.max(1, ...data.leaderboard.map((row) => row.points));

  return (
    <div className="page-enter mx-auto max-w-[1000px]">
      <BackLink />
      <div className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono text-xs uppercase tracking-[.15em] text-primary">
            League / Today · code {data.league.inviteCode}
          </span>
          <h1 className="display mt-2 text-4xl font-bold tracking-[-.07em] md:text-6xl">{data.league.name}</h1>
          <p className="mt-2 text-muted-foreground">{data.topic.title}</p>
        </div>
        <span className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
          {submitted.length} / {data.members.length} submitted
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">League board</div>
              <h2 className="display mt-1 text-2xl font-bold tracking-[-.05em]">Today's top picks</h2>
            </div>
            <Trophy size={20} className="text-primary" />
          </div>
          <div className="mt-6 space-y-3">
            {data.leaderboard.map((entry, i) => (
              <LeaderboardRow key={entry.entryId} entry={entry} maxPoints={maxPoints} index={i} />
            ))}
            {!data.leaderboard.length && (
              <EmptyState
                title="No picks to compare yet."
                description="Your friends' lists will make the board once the crew has submitted."
              />
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[24px] bg-[#222936] p-5 text-[#fff8e9]">
            <div className="mono text-[10px] uppercase tracking-[.14em] text-[#b6c0bd]">The crew</div>
            <div className="mt-4 space-y-3">
              {data.members.map((member) => (
                <div key={member.playerId} className="flex items-center gap-2.5">
                  <Avatar name={member.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.name}</span>
                  <span className={`text-[10px] font-bold ${member.submitted ? 'text-[#8bd3b8]' : 'text-[#b6b7b6]'}`}>
                    {member.submitted ? 'IN' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-border bg-card p-5">
            <div className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Same-brain check</div>
            <div className="mt-3 text-sm leading-6">
              {data.similarity.mostSimilar ? (
                <>
                  <strong>{data.similarity.mostSimilar}</strong> has the closest list to yours.
                </>
              ) : (
                'Similarity stats will show up when the crew has more lists in.'
              )}
            </div>
            {data.similarity.leastSimilar && (
              <div className="mt-2 text-xs text-muted-foreground">Furthest apart: {data.similarity.leastSimilar}</div>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-5 rounded-[24px] border border-border bg-card p-5 sm:p-6">
        <h2 className="display text-xl font-bold">The crew’s five</h2>
        <p className="mt-1 text-sm text-muted-foreground">Everyone in the league who has submitted today.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {submitted.map((member) => (
            <article key={member.playerId} className="rounded-2xl bg-muted/65 p-4">
              <div className="flex items-center gap-2.5">
                <Avatar name={member.name} size="sm" />
                <span className="text-sm font-bold">{member.name}</span>
              </div>
              <ol className="mt-3 space-y-1.5">
                {member.picks.map((pick) => (
                  <li key={pick.rank} className="flex gap-2 text-xs">
                    <span className="mono w-4 text-primary">{pick.rank}</span>
                    <span>{pick.label}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
