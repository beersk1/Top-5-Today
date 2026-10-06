// The frame around every page once a player is chosen: top bar, page content, footer.

import { useState, type ReactNode } from 'react';
import { Link, useRoute } from 'wouter';
import { Menu, UserRoundCog } from 'lucide-react';
import { usePlayer } from '../player';
import { Avatar, Brand, Button, ThemeToggle } from './ui';

const NAV_ITEMS = [
  { href: '/', label: 'Today' },
  { href: '/archive', label: 'Archive' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/profile', label: 'My stats' },
  { href: '/topics', label: 'Topic planner' },
];

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const [active] = useRoute(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`focus-ring rounded-full px-4 py-2 text-sm font-bold no-underline transition-colors ${active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {label}
    </Link>
  );
}

function TopBar() {
  const { player, switchPlayer } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = player?.name ?? 'You';
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between px-5 md:px-8">
        <Brand />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/profile"
            className="focus-ring hidden items-center gap-2 rounded-full bg-card px-2 py-1.5 text-sm font-semibold no-underline sm:flex"
          >
            <Avatar name={name} size="sm" />
            <span>{name}</span>
          </Link>
          <Button
            onClick={switchPlayer}
            aria-label="Switch player"
            className="hidden h-10 border border-border bg-card px-3 text-sm hover:bg-muted sm:inline-flex"
          >
            <UserRoundCog size={16} />
            <span className="hidden xl:inline">Switch player</span>
          </Button>
          <Button
            aria-label="Open navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-10 w-10 border border-border bg-card lg:hidden"
          >
            <Menu size={18} />
          </Button>
        </div>
      </div>
      {menuOpen && (
        <nav className="grid gap-1 border-t border-border bg-background px-5 py-3 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} onClick={() => setMenuOpen(false)} />
          ))}
          <button
            type="button"
            onClick={switchPlayer}
            className="focus-ring rounded-full px-4 py-2 text-left text-sm font-bold text-muted-foreground hover:bg-muted sm:hidden"
          >
            Switch player ({name})
          </button>
        </nav>
      )}
    </header>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="paper-grain min-h-[100dvh] bg-background text-foreground">
      <TopBar />
      <main className="relative z-0 mx-auto min-h-[calc(100dvh-70px)] max-w-[1240px] px-5 py-8 md:px-8 md:py-12">
        {children}
      </main>
      <footer className="border-t border-border/70 px-5 py-6 text-center text-xs font-medium text-muted-foreground">
        A daily ritual for people with opinions. <span className="mono ml-1">ONE TOPIC. FIVE PICKS. NO TAKEBACKS.</span>
      </footer>
    </div>
  );
}
