// Schedule your own question for today or any future day.
// Days you don't schedule use the built-in rotation from server/sample-data.ts.

import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { usePlannedTopics, useSaveTopic } from '../api';
import { Button } from '../components/ui';
import { formatDate } from '../lib/format';

const todayUtc = () => new Date().toISOString().slice(0, 10);

export function TopicPlannerPage() {
  const topics = usePlannedTopics();
  const saveTopic = useSaveTopic();
  const [day, setDay] = useState(todayUtc);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setNotice('');
    saveTopic.mutate(
      { day, title, description },
      {
        onSuccess: () => setNotice(`Saved the question for ${formatDate(day)}.`),
        onError: (error) => setNotice(error.message),
      },
    );
  };

  return (
    <div className="page-enter mx-auto max-w-[1000px]">
      <div className="mb-7">
        <span className="mono text-xs uppercase tracking-[.15em] text-primary">Topic planner</span>
        <h1 className="display mt-2 text-4xl font-bold tracking-[-.07em] md:text-5xl">Set the next question.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Schedule or revise a question for today or a future date. A question locks once a real player submits a list.
          Days you leave empty get a question from the built-in rotation.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
          <div className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Topic details</div>
          <label className="mt-5 block text-sm font-bold" htmlFor="topic-day">
            Date (UTC)
          </label>
          <input
            id="topic-day"
            type="date"
            min={todayUtc()}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            required
            className="focus-ring mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
          <label className="mt-4 block text-sm font-bold" htmlFor="topic-title">
            Question
          </label>
          <input
            id="topic-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={3}
            maxLength={140}
            required
            placeholder="Top 5 films you’d recommend to anyone"
            className="focus-ring mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
          <label className="mt-4 block text-sm font-bold" htmlFor="topic-description">
            Extra guidance (optional)
          </label>
          <textarea
            id="topic-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Add context that helps people make their lists."
            className="focus-ring mt-2 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm"
          />
          {notice && (
            <p role="status" className="mt-3 text-sm font-semibold text-primary">
              {notice}
            </p>
          )}
          <Button
            type="submit"
            disabled={saveTopic.isPending}
            className="mt-5 h-11 bg-primary px-5 text-sm text-primary-foreground"
          >
            {saveTopic.isPending ? 'Saving…' : 'Save question'} <ArrowRight size={15} />
          </Button>
        </form>

        <aside className="rounded-[24px] border border-border bg-card p-5 sm:p-6">
          <div className="mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Scheduled</div>
          <h2 className="display mt-1 text-2xl font-bold">Upcoming questions</h2>
          {topics.isLoading ? (
            <div className="mt-4 h-28 animate-pulse rounded-xl bg-muted" />
          ) : topics.isError ? (
            <p role="alert" className="mt-4 text-sm font-semibold text-primary">
              Scheduled questions could not be loaded.
            </p>
          ) : !topics.data?.length ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing scheduled yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {topics.data.map((topic) => (
                <article key={topic.id} className="rounded-xl bg-muted/70 p-3">
                  <div className="mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                    {formatDate(topic.date)} · {topic.submissionCount} submissions
                  </div>
                  <h3 className="mt-1 text-sm font-bold">{topic.title}</h3>
                  {topic.editable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDay(topic.date);
                        setTitle(topic.title);
                        setDescription(topic.description);
                      }}
                      className="mt-2 text-xs font-bold text-primary"
                    >
                      Edit question
                    </button>
                  ) : (
                    <span className="mt-2 inline-block text-xs font-semibold text-muted-foreground">
                      Locked: a player already submitted
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
