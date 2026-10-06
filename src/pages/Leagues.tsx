// Your friend groups: create one, join one with an invite code, or open one.

import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronRight, Plus, Users, X } from 'lucide-react';
import { useCreateLeague, useJoinLeague, useLeagues } from '../api';
import { Button, EmptyState, LoadError } from '../components/ui';
import { formatDate } from '../lib/format';

export function LeaguesPage() {
  const { data, isLoading, isError, refetch } = useLeagues();
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const create = (event: FormEvent) => {
    event.preventDefault();
    createLeague.mutate(name.trim(), {
      onSuccess: (league) => {
        setName('');
        setCreateOpen(false);
        setMessage(`Your league is ready. Share invite code ${league.inviteCode} with your crew.`);
      },
      onError: (error) => setMessage(error.message),
    });
  };

  const join = (event: FormEvent) => {
    event.preventDefault();
    joinLeague.mutate(code.trim(), {
      onSuccess: () => {
        setCode('');
        setMessage('You’re in. The league is on your list.');
      },
      onError: (error) => setMessage(error.message),
    });
  };

  return (
    <div className="page-enter mx-auto max-w-[960px]">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="mono text-xs uppercase tracking-[.16em] text-primary">Your people, your scoreboard</span>
          <h1 className="display mt-2 text-4xl font-bold tracking-[-.07em] md:text-6xl">Friend leagues.</h1>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
            A private little arena for excellent taste and questionable confidence.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(!createOpen)}
          className="h-12 bg-primary px-5 text-sm text-primary-foreground"
        >
          {createOpen ? <X size={16} /> : <Plus size={16} />}
          {createOpen ? 'Close' : 'Create a league'}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {createOpen && (
          <form onSubmit={create} className="rounded-[22px] border border-border bg-card p-5">
            <div className="display text-lg font-bold">Start a new circle.</div>
            <p className="mt-1 text-sm text-muted-foreground">Give your group a name. The invite code comes with it.</p>
            <label htmlFor="league-name" className="mt-4 block text-xs font-bold">
              League name
            </label>
            <input
              id="league-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={48}
              required
              placeholder="The Extremely Correct Club"
              className="focus-ring mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none"
            />
            <Button
              type="submit"
              disabled={createLeague.isPending}
              className="mt-3 h-11 w-full bg-primary text-sm text-primary-foreground"
            >
              {createLeague.isPending ? 'Making the league…' : 'Create league'} <ArrowRight size={15} />
            </Button>
          </form>
        )}
        <form onSubmit={join} className="rounded-[22px] border border-border bg-card p-5">
          <div className="display text-lg font-bold">Got an invite?</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop in the code your friend sent over. Try <span className="mono font-bold">SAMPLE5</span> to join the
            sample crew.
          </p>
          <label htmlFor="invite-code" className="mt-4 block text-xs font-bold">
            Invite code
          </label>
          <input
            id="invite-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            minLength={6}
            maxLength={16}
            required
            placeholder="E.G. SAMPLE5"
            className="focus-ring mono mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm uppercase tracking-[.1em] outline-none"
          />
          <Button
            type="submit"
            disabled={joinLeague.isPending}
            className="mt-3 h-11 w-full bg-secondary text-sm text-secondary-foreground"
          >
            {joinLeague.isPending ? 'Joining…' : 'Join this league'} <ArrowRight size={15} />
          </Button>
        </form>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm font-semibold text-primary">
          {message}
        </p>
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="grid animate-pulse gap-3 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-36 rounded-[22px] bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <LoadError retry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState
            title="No leagues. Yet."
            description="Bring your group chat together: create a league or use a friend's invite code."
            action={
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-primary px-4 py-2.5 text-sm text-primary-foreground"
              >
                <Plus size={15} /> Create your first
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.map((league) => (
              <Link
                href={`/leagues/${league.id}`}
                key={league.id}
                className="lift focus-ring group rounded-[22px] border border-border bg-card p-5 no-underline"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Users size={19} />
                  </span>
                  <ChevronRight
                    className="mt-1 text-muted-foreground transition-transform group-hover:translate-x-1"
                    size={18}
                  />
                </div>
                <h2 className="display mt-4 text-2xl font-bold tracking-[-.05em] text-foreground">{league.name}</h2>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'} · code{' '}
                    <span className="mono font-bold">{league.inviteCode}</span>
                  </span>
                  <span className="mono">SINCE {formatDate(league.createdAt)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs font-bold text-primary">
                  Today's head-to-head <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
