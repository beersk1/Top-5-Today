// Decides which page to show. No player chosen yet -> welcome page. Otherwise -> the app.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { AppFrame } from './components/Layout';
import { PlayerProvider, usePlayer } from './player';
import { ArchivePage } from './pages/Archive';
import { LeagueTodayPage } from './pages/LeagueToday';
import { LeaguesPage } from './pages/Leagues';
import { ProfilePage } from './pages/Profile';
import { TodayPage } from './pages/Today';
import { TopicPlannerPage } from './pages/TopicPlanner';
import { WelcomePage } from './pages/Welcome';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <span className="mono text-xs text-primary">404 / WRONG TURN</span>
      <h1 className="display mt-3 text-5xl font-bold">Not on today’s list.</h1>
      <p className="mt-3 text-muted-foreground">This page isn’t a pick. Let’s get you back to the good stuff.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground no-underline"
      >
        Back to today <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function Pages() {
  const { player, loading } = usePlayer();
  if (loading) return <div className="min-h-[100dvh] animate-pulse bg-background" />;
  if (!player) return <WelcomePage />;
  return (
    <AppFrame>
      <Switch>
        <Route path="/" component={TodayPage} />
        <Route path="/archive" component={ArchivePage} />
        <Route path="/leagues" component={LeaguesPage} />
        <Route path="/leagues/:id" component={LeagueTodayPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/topics" component={TopicPlannerPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </AppFrame>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <Pages />
      </PlayerProvider>
    </QueryClientProvider>
  );
}
