// The home page: today's question. Before you submit you see the list builder,
// after you submit you see the crowd's results.

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Lightbulb,
  LockKeyhole,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useResults, useSubmitPicks, useSuggestions, useToday } from '../api';
import { Button, EmptyState, LeaderboardRow, LoadError, LoadingBlocks } from '../components/ui';
import { formatTime, ordinal } from '../lib/format';

const GROUND_RULES = [
  ['01', 'Your real top five', 'Not what you think everyone else will say.'],
  ['02', 'Suggestions, not scoring', 'We’ll help match a pick as you type.'],
  ['03', 'Submit, then compare', 'Nobody sees the crowd before you lock in.'],
];

export function TodayPage() {
  const { data, isLoading, isError, refetch } = useToday();
  if (isLoading) return <LoadingBlocks heights={['h-16', 'h-96']} />;
  if (isError || !data) return <LoadError retry={() => refetch()} />;

  const { topic } = data;
  return (
    <div className="page-enter">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div className="mono flex items-center gap-2 text-xs uppercase tracking-[.15em] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Today’s prompt
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {topic.submissionCount.toLocaleString()} playing
            </span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              Closes {formatTime(topic.closesAt)}
            </span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_310px]">
          <div>
            <div className="mb-7">
              <h1 className="display max-w-[750px] text-4xl font-bold leading-[1.02] tracking-[-.065em] md:text-6xl">
                {topic.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{topic.description}</p>
            </div>
            {data.hasSubmitted ? <ResultsPanel topicId={topic.id} /> : <PickBuilder topicId={topic.id} />}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[22px] border border-border bg-card p-5">
              <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
                Today's ground rules
              </div>
              <div className="mt-4 space-y-4">
                {GROUND_RULES.map(([number, title, body]) => (
                  <div key={number} className="flex gap-3">
                    <span className="mono pt-0.5 text-[11px] text-primary">{number}</span>
                    <div>
                      <div className="text-sm font-bold">{title}</div>
                      <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] bg-secondary p-5 text-secondary-foreground">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <LockKeyhole size={16} />
                No peeking
              </div>
              <p className="mt-2 text-sm leading-6 opacity-80">
                Your submission unlocks the results. Honest picks make the reveal worth it.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Waits until the user stops typing for a moment before returning the new value. */
function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const EMPTY_SLOTS = ['', '', '', '', ''];

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Five text boxes, one per rank. Type in any of them, in any order. */
function PickBuilder({ topicId }: { topicId: string }) {
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [prediction, setPrediction] = useState('');
  const [error, setError] = useState('');
  const submitPicks = useSubmitPicks(topicId);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const typing = activeSlot === null ? '' : slots[activeSlot].trim();
  const suggestions = useSuggestions(topicId, useDebounced(typing, 240));
  // Hide suggestions already used in another slot, or identical to what's typed.
  const matches = (suggestions.data ?? [])
    .filter((item) => !slots.some((value) => sameText(value, item.label)))
    .slice(0, 4);
  const showSuggestions = typing.length >= 2 && matches.length > 0;

  const filled = slots.filter((value) => value.trim()).length;
  const filledLabels = slots.map((value) => value.trim().toLowerCase()).filter(Boolean);
  const hasDuplicates = new Set(filledLabels).size !== filledLabels.length;
  const ready = filled === 5 && !hasDuplicates;

  const setSlot = (index: number, value: string) => {
    setSlots((prev) => prev.map((old, i) => (i === index ? value : old)));
    setError('');
  };

  /** Move the cursor to the next empty slot (or just the next slot). */
  const focusNext = (from: number) => {
    const nextEmpty = [1, 2, 3, 4].map((step) => (from + step) % 5).find((i) => !slots[i].trim() && i !== from);
    const target = nextEmpty ?? (from + 1 < 5 ? from + 1 : null);
    if (target !== null) inputs.current[target]?.focus();
  };

  const chooseSuggestion = (index: number, label: string) => {
    setSlot(index, label);
    focusNext(index);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target > 4) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submit = () => {
    submitPicks.mutate(
      { picks: slots.map((value) => value.trim()), prediction: prediction.trim() || null },
      { onError: (err) => setError(err.message || 'Couldn’t lock your list just yet. Try once more.') },
    );
  };

  return (
    <section className="rounded-[24px] border border-border bg-card p-4 shadow-[0_16px_60px_rgba(32,39,52,.06)] sm:p-6">
      <div className="flex items-end justify-between">
        <div>
          <span className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Your ranking</span>
          <h2 className="display mt-1 text-2xl font-bold tracking-[-.05em]">Make it yours.</h2>
        </div>
        <span className="mono rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {filled} / 5
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {slots.map((value, i) => {
          const hasValue = Boolean(value.trim());
          return (
            <div key={i}>
              <div
                className={`row-enter flex min-h-[59px] items-center gap-3 rounded-xl border px-3 transition-colors focus-within:border-primary/60 ${hasValue ? 'border-border bg-background' : 'border-dashed border-border/90 bg-background/50'}`}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span
                  className={`mono grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-medium ${i === 0 && hasValue ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  0{i + 1}
                </span>
                <input
                  ref={(element) => {
                    inputs.current[i] = element;
                  }}
                  aria-label={`Pick number ${i + 1}`}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground"
                  placeholder={`Add your ${ordinal(i + 1)} pick…`}
                  value={value}
                  onChange={(event) => setSlot(i, event.target.value)}
                  onFocus={() => setActiveSlot(i)}
                  onBlur={() => setActiveSlot((current) => (current === i ? null : current))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      focusNext(i);
                    }
                  }}
                  maxLength={120}
                />
                {hasValue && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      aria-label={`Move ${value} up`}
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      aria-label={`Move ${value} down`}
                      onClick={() => move(i, 1)}
                      disabled={i === 4}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </Button>
                    <Button
                      aria-label={`Clear ${value}`}
                      onClick={() => setSlot(i, '')}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <X size={15} />
                    </Button>
                  </div>
                )}
              </div>

              {activeSlot === i && showSuggestions && (
                <div className="mt-1.5 rounded-xl border border-border bg-card p-2">
                  <div className="mono px-2 py-1 text-[9px] uppercase tracking-[.14em] text-muted-foreground">
                    Others wrote · tap to use, or keep your own wording
                  </div>
                  {matches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      // mousedown + preventDefault keeps the cursor in the box until the click lands
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(i, item.label)}
                      className="focus-ring flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-muted"
                    >
                      <span>{item.label}</span>
                      <span className="mono text-[10px] text-muted-foreground">{item.pickCount} picks</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(hasDuplicates || error) && (
        <p className="mt-2 text-sm font-semibold text-primary" role="status">
          {error || 'Two of your picks are the same. Great minds, one slot.'}
        </p>
      )}

      <div className="mt-5 rounded-xl bg-muted/75 p-4">
        <label htmlFor="prediction" className="flex items-center gap-2 text-sm font-extrabold">
          <Sparkles size={16} className="text-primary" /> Bonus: predict the crowd’s #1
        </label>
        <p className="mb-2 mt-1 text-xs text-muted-foreground">Only if you have a hunch. Your picks come first.</p>
        <input
          id="prediction"
          value={prediction}
          onChange={(event) => setPrediction(event.target.value)}
          maxLength={120}
          placeholder="What do you think will take the top spot?"
          className="focus-ring w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">A locked list is a good list. No edits after.</span>
        <Button
          onClick={submit}
          disabled={!ready || submitPicks.isPending}
          className="h-12 bg-primary px-5 text-sm text-primary-foreground shadow-[0_4px_0_hsl(var(--primary)/.24)] hover:-translate-y-0.5"
        >
          {submitPicks.isPending ? (
            'Locking your list…'
          ) : (
            <>
              Lock my five <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

function ResultsPanel({ topicId }: { topicId: string }) {
  const { data, isLoading, isError, refetch } = useResults(topicId);
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-border bg-card p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Check size={18} />
          </span>
          <div>
            <div className="font-bold">Your five are locked.</div>
            <div className="text-sm text-muted-foreground">Gathering the crowd. One moment…</div>
          </div>
        </div>
        <div className="mt-6 h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  if (isError || !data)
    return <LoadError retry={() => refetch()} message="Your list is locked. Results are taking a beat." />;

  const maxPoints = Math.max(1, ...data.leaderboard.map((row) => row.points));
  const crowdByEntry = new Map(data.leaderboard.map((entry) => [entry.entryId, entry]));
  const sharedPicks = data.yourPicks.filter((pick) => crowdByEntry.has(pick.entryId)).length;
  const predictionNote =
    data.predictionCorrect === null ? (
      'Revealed when the day closes.'
    ) : data.predictionCorrect ? (
      <>
        <Check size={14} /> Called it.
      </>
    ) : (
      'A bold miss. Tomorrow’s yours.'
    );

  return (
    <div className="page-enter space-y-5">
      <section
        aria-labelledby="your-locked-picks"
        className="overflow-hidden rounded-[24px] border border-border bg-card"
      >
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-muted-foreground">
                <LockKeyhole size={13} aria-hidden="true" /> Your list
              </div>
              <h2 id="your-locked-picks" className="display mt-2 text-2xl font-bold">
                Your locked picks
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
              <CheckCircle2 size={15} aria-hidden="true" /> Submitted
            </span>
          </div>
          <ol className="mt-5 divide-y divide-border">
            {[...data.yourPicks]
              .sort((a, b) => a.rank - b.rank)
              .map((pick) => {
                return (
                  <li key={pick.entryId} className="flex items-start gap-3 py-4">
                    <span
                      aria-hidden="true"
                      className={`mono grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${pick.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      {String(pick.rank).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-6 [overflow-wrap:anywhere]">{pick.label}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {pick.otherUserCount.toLocaleString()} other {pick.otherUserCount === 1 ? 'user' : 'users'}{' '}
                          picked this
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ol>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground sm:px-6">
          <Users size={14} className="shrink-0" aria-hidden="true" />
          <p>
            <strong>{sharedPicks} of 5</strong> picks in the crowd's top five
          </p>
        </div>
      </section>

      <div className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-muted-foreground">
              <Users size={13} className="text-secondary-foreground" /> Crowd results
            </div>
            <h2 className="display mt-2 text-2xl font-bold tracking-[-.05em]">The crowd has spoken.</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {data.totalSubmissions.toLocaleString()} submissions
          </span>
        </div>
        <div className="mt-6 space-y-3">
          {data.leaderboard.map((entry, i) => (
            <LeaderboardRow entry={entry} key={entry.entryId} maxPoints={maxPoints} index={i} />
          ))}
          {!data.leaderboard.length && (
            <EmptyState
              title="The crowd is warming up."
              description="Your list is first. Check back as today's picks roll in."
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[22px] bg-[#222936] p-5 text-[#fff8e9]">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] uppercase tracking-[.14em] text-[#b6c0bd]">Hot take score</span>
            <Flame size={18} className="text-[#f5cc4e]" />
          </div>
          <div className="display mt-2 text-5xl font-bold tracking-[-.07em]">
            {data.hotTakeScore}
            <span className="ml-1 text-lg text-[#adb4b2]">/ 100</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#b6c0bd]">
            How far your list wandered from the middle of the room.
          </p>
        </div>
        <div className="rounded-[22px] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Your crowd call</span>
            <BarChart3 size={18} className="text-primary" />
          </div>
          <div className="display mt-2 text-2xl font-bold tracking-[-.05em]">
            {data.prediction ?? 'No prediction today'}
          </div>
          <div
            className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold ${data.predictionCorrect === true ? 'text-secondary-foreground' : data.predictionCorrect === false ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {data.prediction ? predictionNote : 'Optional means optional.'}
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Lightbulb size={17} className="text-primary" />
          <h3 className="display text-lg font-bold">The interesting bits</h3>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.insights.map((insight) => (
            <p key={insight} className="rounded-xl bg-muted/70 p-3 text-sm leading-6">
              {insight}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
