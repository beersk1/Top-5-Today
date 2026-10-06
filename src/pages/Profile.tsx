// Your streak, prediction accuracy, average hot-take score and every list you've made.

import { Link } from 'wouter';
import { ArrowRight, BarChart3, Flame, Sparkles } from 'lucide-react';
import { useProfile } from '../api';
import { Avatar, EmptyState, LoadError, LoadingBlocks, StatCard } from '../components/ui';
import { formatDate } from '../lib/format';

export function ProfilePage() {
  const { data, isLoading, isError, refetch } = useProfile();
  if (isLoading) return <LoadingBlocks heights={['h-44', 'h-40']} />;
  if (isError || !data) return <LoadError retry={() => refetch()} />;

  return (
    <div className="page-enter mx-auto max-w-[1000px]">
      <div className="relative overflow-hidden rounded-[28px] bg-[#222936] p-6 text-[#fff8e9] sm:p-9">
        <div className="absolute -right-12 -top-16 h-60 w-60 rounded-full border-[36px] border-[#f5cc4e]/15" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Avatar name={data.name} />
          <div className="flex-1">
            <span className="mono text-[10px] uppercase tracking-[.16em] text-[#bdc5c2]">A person with receipts</span>
            <h1 className="display mt-1 text-4xl font-bold tracking-[-.065em]">{data.name}</h1>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <div className="mono text-[9px] uppercase tracking-[.15em] text-[#bdc5c2]">on the board</div>
            <div className="display mt-1 text-xl font-bold">{data.history.length} days</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Day streak"
          value={`${data.streak}`}
          suffix="days"
          detail="Keep the daily ritual going."
          icon={<Flame size={18} />}
        />
        <StatCard
          label="Prediction accuracy"
          value={`${data.predictionAccuracy}%`}
          detail="When you call the crowd's #1."
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="Average hot take"
          value={`${data.averageHotTakeScore}`}
          suffix="/ 100"
          detail="Your average distance from consensus."
          icon={<Sparkles size={18} />}
        />
      </div>

      <div className="mb-4 mt-9 flex items-end justify-between">
        <div>
          <span className="mono text-[10px] uppercase tracking-[.15em] text-primary">Your opinionated past</span>
          <h2 className="display mt-1 text-3xl font-bold tracking-[-.055em]">List history.</h2>
        </div>
        <Link href="/archive" className="text-xs font-bold text-primary no-underline">
          All topics <ArrowRight className="ml-1 inline" size={14} />
        </Link>
      </div>

      {!data.history.length ? (
        <EmptyState
          title="Your record starts today."
          description="Submit your first five picks and your trail of hot takes will build here."
          action={
            <Link href="/" className="font-bold text-primary no-underline">
              Today's topic <ArrowRight className="ml-1 inline" size={15} />
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.history.map(({ topic, picks, hotTakeScore }) => (
            <article key={topic.id} className="rounded-[20px] border border-border bg-card p-5">
              <div className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                {formatDate(topic.date)}
              </div>
              <h3 className="display mt-1 text-lg font-bold">{topic.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {picks.slice(0, 3).map((pick) => (
                  <span key={pick.entryId} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs">
                    <span className="mono mr-1.5 text-primary">#{pick.rank}</span>
                    {pick.label}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Hot take score {hotTakeScore} / 100</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
