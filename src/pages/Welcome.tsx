// Shown when no player is chosen yet. Type a name to start, or continue as someone who already played.

import { useState, type FormEvent } from 'react';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { useCreatePlayer, useServerHealth } from '../api';
import { Avatar, Brand, Button, ThemeToggle } from '../components/ui';
import { usePlayer } from '../player';

const DEMO_PICKS = [
  'Cold pizza, no debate',
  'A suspiciously good pickle',
  'Yesterday’s noodles',
  'Shredded cheese by the handful',
  'The one perfect strawberry',
];

const HOW_IT_WORKS = [
  [
    '01',
    'Pick like you mean it',
    'Build a ranked five from your own brain. Crowd suggestions help with names, not opinions.',
  ],
  ['02', 'Lock before the reveal', 'Your list stays yours until you submit. Then the whole crowd comes into view.'],
  ['03', 'Find your people', 'Compare with friends, collect hot takes, and keep a streak worth bragging about.'],
];

function PlayerPicker() {
  const { players, choosePlayer, serverDown } = usePlayer();
  const createPlayer = useCreatePlayer();
  const [name, setName] = useState('');

  const start = (event: FormEvent) => {
    event.preventDefault();
    createPlayer.mutate(name.trim(), { onSuccess: choosePlayer });
  };

  if (serverDown) {
    return (
      <div className="mt-9 max-w-[495px] rounded-2xl border border-[#f5cc4e]/40 bg-white/5 p-5 text-sm leading-6">
        <strong className="text-[#f5cc4e]">Can’t reach the local server.</strong> Start it with{' '}
        <code className="mono rounded bg-white/10 px-1.5 py-0.5">npm run dev</code> and refresh this page.
      </div>
    );
  }

  return (
    <div className="mt-9 max-w-[495px]">
      <form onSubmit={start} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="player-name" className="sr-only">
          Your name
        </label>
        <input
          id="player-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          required
          placeholder="What should we call you?"
          className="focus-ring min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm text-[#fffaf0] outline-none placeholder:text-[#a9b1b1]"
        />
        <Button
          type="submit"
          disabled={createPlayer.isPending || !name.trim()}
          className="rounded-2xl bg-[#e85b38] px-6 py-4 text-sm font-extrabold text-white shadow-[0_8px_0_#ac3b25] hover:-translate-y-1 hover:shadow-[0_10px_0_#ac3b25]"
        >
          Start playing <ArrowRight size={18} />
        </Button>
      </form>
      {createPlayer.isError && (
        <p role="alert" className="mt-3 text-sm font-semibold text-[#f5cc4e]">
          {createPlayer.error.message}
        </p>
      )}
      {players.length > 0 && (
        <div className="mt-6">
          <div className="mono text-[11px] uppercase tracking-[.14em] text-[#c7d5cd]">Or continue as</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => choosePlayer(player)}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-1.5 pr-4 text-sm font-semibold hover:bg-white/10"
              >
                <Avatar name={player.name} size="sm" />
                {player.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WelcomePage() {
  const health = useServerHealth();
  const online = health.data?.ok === true;
  return (
    <div className="paper-grain min-h-[100dvh] overflow-hidden bg-[#222936] text-[#fbf5e8]">
      <div className="relative z-10 mx-auto max-w-[1320px] px-5 md:px-10">
        <header className="flex h-[82px] items-center justify-between">
          <Brand inverse />
          <ThemeToggle />
        </header>

        <section className="grid min-h-[680px] items-center gap-10 pb-20 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:pt-4">
          <div className="page-enter max-w-[650px]">
            <div className="mono mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[.14em] text-[#c7d5cd]">
              <span className="h-2 w-2 rounded-full bg-[#f5cc4e]" /> Your friends are probably wrong
            </div>
            <h1 className="display max-w-[710px] text-[clamp(4rem,9vw,8.8rem)] font-bold leading-[.88] tracking-[-.085em]">
              Five picks.
              <br />
              <span className="text-[#f5cc4e]">One hot take.</span>
            </h1>
            <p className="mt-8 max-w-[495px] text-lg leading-8 text-[#c5c9cc] md:text-xl">
              A new question every day. Rank what you actually believe, then see where your friends land.
            </p>
            <PlayerPicker />
          </div>

          {/* Example card, just for show */}
          <div className="page-enter relative mx-auto w-full max-w-[590px] [animation-delay:120ms]">
            <div className="absolute -right-10 top-0 h-56 w-56 rounded-full bg-[#e85b38]/20 blur-3xl" />
            <div className="relative rotate-[1.3deg] rounded-[28px] border border-white/10 bg-[#f7f1e3] p-5 text-[#222936] shadow-[0_30px_100px_rgba(0,0,0,.28)] md:p-7">
              <div className="flex items-center justify-between border-b border-[#dfd8c9] pb-4">
                <span className="mono text-[10px] font-medium uppercase tracking-[.18em] text-[#797968]">
                  TODAY'S QUESTION · 06/18
                </span>
                <span className="rounded-full bg-[#e7eee5] px-3 py-1 text-[11px] font-bold text-[#397564]">OPEN</span>
              </div>
              <h2 className="display mt-5 text-3xl font-bold leading-[1.03] tracking-[-.06em] md:text-[42px]">
                Best things to eat
                <br />
                straight from the fridge
              </h2>
              <p className="mt-2 text-sm text-[#73766f]">Be honest. Nobody's grading your taste.</p>
              <div className="mt-6 space-y-2.5">
                {DEMO_PICKS.map((label, i) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-[#e5dfd1] bg-[#fffdf7] px-3 py-3.5"
                  >
                    <span
                      className={`mono grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-medium ${i === 0 ? 'bg-[#f5cc4e]' : 'bg-[#f0ece2] text-[#787a72]'}`}
                    >
                      0{i + 1}
                    </span>
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="ml-auto text-[#a9a99d]">
                      <ChevronDown size={15} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-[#222936] px-4 py-3 text-[#fffaf0]">
                <span className="flex items-center gap-2 text-sm">
                  <Sparkles size={15} className="text-[#f5cc4e]" /> Predict the crowd's #1?
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Optional</span>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="mono text-[10px] uppercase tracking-[.14em] text-[#77796e]">
                  YOUR LIST. YOUR CALL.
                </span>
                <span className="rounded-xl bg-[#e85b38] px-4 py-3 text-xs font-extrabold text-white">
                  Lock it in <ArrowRight className="ml-1 inline" size={13} />
                </span>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-7 hidden -rotate-6 rounded-2xl bg-[#f5cc4e] px-4 py-3 text-[#222936] shadow-xl sm:block">
              <div className="mono text-[9px] uppercase tracking-[.13em]">the rule</div>
              <div className="display mt-0.5 text-lg font-bold">No edits after reveal.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 border-t border-white/15 py-16 md:grid-cols-3">
          {HOW_IT_WORKS.map(([number, title, description]) => (
            <div key={number} className="border-l border-[#f5cc4e]/50 pl-5">
              <span className="mono text-xs text-[#f5cc4e]">{number} / THE DAILY LOOP</span>
              <h3 className="display mt-4 text-2xl font-bold">{title}</h3>
              <p className="mt-2 max-w-[330px] leading-6 text-[#aeb6b8]">{description}</p>
            </div>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 py-6 text-xs text-[#9ca5a7]">
          <span>Top Five Today · A friendly place for strong opinions.</span>
          <span className="mono flex items-center gap-2 uppercase tracking-[.1em]">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#8bd3b8]' : 'bg-[#f5cc4e]'}`} />
            {online ? 'Local server running' : 'Local server not reachable'}
          </span>
        </footer>
      </div>
    </div>
  );
}
