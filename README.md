# Top 5 Today

**One question a day. Rank your top five. See how your picks compare.**

Every day there's a new prompt ("Top 5 movies you can watch over and over"). You build a ranked list of five, lock it in, and only then see the crowd's leaderboard, your "hot take" score, and how your friends ranked theirs.

This version runs entirely on your computer. There's no cloud database, no sign-in service and no API keys. Data lives in plain JSON files you can open in VS Code.

---

## Quick start

You need **Node.js 20 or newer** ([download](https://nodejs.org)). Check with `node -v`.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**, type a name, and play.

On the first run the app creates a `data/` folder with 8 sample players, six days of past questions (so the archive isn't empty) and a sample league. To join that league, enter invite code **`SAMPLE5`** on the Leagues page.

Stop the app with `Ctrl + C` in the terminal.

---

## What you can do

| Page              | What it's for                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**         | Build your ranked five. As you type, it suggests spellings other people already used. You can also predict the crowd's #1. After you submit, you see the results.                 |
| **Archive**       | Every past question and the five picks that won it.                                                                                                                               |
| **Leagues**       | Create a friend group (you get an invite code) or join one. Each league shows a head-to-head for today: its own leaderboard, who's submitted, and whose list is closest to yours. |
| **My stats**      | Day streak, prediction accuracy, average hot-take score and your full list history.                                                                                               |
| **Topic planner** | Write your own question for today or any future day. Days you leave empty use the built-in rotation.                                                                              |

**Switching players:** use the "Switch player" button in the top bar. It's the easiest way to test leagues: make two players, put them in the same league, and submit as each one.

**The rules:**

- One list per player per day. No edits after you submit.
- You can't see results or league picks until you've submitted your own list.
- Days follow **UTC** time, so the question changes at midnight UTC (5:30 AM in India).

---

## Commands

| Command              | What it does                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`        | Starts the server and the website together, and reloads automatically when you save a file. Use this while coding.                |
| `npm run build`      | Checks all the TypeScript for errors, then builds an optimised website into `dist/`.                                              |
| `npm start`          | Runs the built version. The server also serves the website, so everything is at http://localhost:3001. Run `npm run build` first. |
| `npm run typecheck`  | Only checks for TypeScript errors.                                                                                                |
| `npm run format`     | Formats every file with Prettier.                                                                                                 |
| `npm run reset-data` | Deletes the `data/` folder. Fresh sample data is created the next time you start the app.                                         |

---

## How it fits together

```
 Browser (localhost:5173)                 Local server (localhost:3001)           Your disk
┌──────────────────────────┐   /api/...   ┌──────────────────────────────┐        ┌──────────────────┐
│  React website  (src/)   │ ───────────▶ │  Express  (server/)          │ ─────▶ │ data/players.json│
│  pages, buttons, forms   │ ◀─────────── │  game rules, scoring, stats  │ ◀───── │ data/topics.json │
└──────────────────────────┘     JSON     └──────────────────────────────┘        │ data/...         │
                                                                                   └──────────────────┘
```

- **Website (`src/`)** is the React app. It never touches files directly. It asks the server for everything through `src/api.ts`.
- **Server (`server/`)** is a small Express app that owns all the rules: what today's question is, matching spellings, scoring, streaks and leagues.
- **Data (`data/`)** holds one JSON file per kind of thing. The server reads them on every request, so you can edit them by hand while the app runs.
- **`shared/types.ts`** describes what each piece of data looks like. Both the website and the server import it, so if you change a shape TypeScript tells you everywhere that needs updating.

During `npm run dev`, Vite (the website dev server) forwards any `/api/...` request to port 3001. That's the `proxy` line in `vite.config.ts`.

### Who's playing?

There are no accounts. When you pick a name, the browser stores that player's id in `localStorage` and sends it with every request as an `x-player-id` header. The server looks the id up in `data/players.json`. That's fine on your own computer, but it isn't security. See [Before putting this online](#before-putting-this-online).

---

## Project layout

```
top-5-today-local/
├── index.html              Page shell the website loads into
├── package.json            Dependencies and the npm commands above
├── vite.config.ts          Website dev server settings (port, /api forwarding)
├── tsconfig.json           TypeScript settings (shared by website and server)
│
├── shared/
│   └── types.ts            Shapes of everything the server sends the website
│
├── server/                 The local server
│   ├── index.ts            Starts Express, sets up /api, handles errors
│   ├── routes.ts           Every API URL: what it reads, checks and returns
│   ├── game.ts             Game rules: daily topic, spelling matching, scoring, stats
│   ├── store.ts            Reads and writes the JSON files in data/
│   ├── sample-data.ts      Built-in daily questions and sample players' answer pools
│   ├── seed.ts             Fills an empty data/ folder on first run
│   └── reset.ts            Used by `npm run reset-data`
│
├── src/                    The website
│   ├── main.tsx            Entry point: mounts <App /> into index.html
│   ├── App.tsx             Picks which page to show (welcome page vs. the app)
│   ├── api.ts              Every call to the server, as React hooks (useToday, useLeagues…)
│   ├── player.tsx          Remembers which player is active, and switching players
│   ├── index.css           Colors, fonts, light/dark theme, small animations
│   ├── lib/format.ts       Date and time formatting helpers
│   ├── components/
│   │   ├── Layout.tsx      Top bar, navigation and footer around every page
│   │   └── ui.tsx          Reusable pieces: Button, Avatar, LeaderboardRow, StatCard…
│   └── pages/
│       ├── Welcome.tsx     First screen: pick or create a player
│       ├── Today.tsx       Build your list, then see results
│       ├── Archive.tsx
│       ├── Leagues.tsx
│       ├── LeagueToday.tsx
│       ├── Profile.tsx     "My stats"
│       └── TopicPlanner.tsx
│
├── public/                 Static files served as-is (logo)
└── data/                   Created on first run. Your actual data. Not committed to git.
```

---

## The data files

All in `data/`, all plain JSON arrays:

| File               | One row is…                     | Key fields                                                                                       |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `players.json`     | a player                        | `id`, `name`, `isSample` (true for the made-up players)                                          |
| `topics.json`      | one day's question              | `day` (`YYYY-MM-DD`), `title`, `description`                                                     |
| `entries.json`     | a distinct answer to a question | `label` ("The Dark Knight"), `normalized` ("the dark knight"), `aliases` (other spellings typed) |
| `submissions.json` | one player's list for one day   | `playerId`, `topicId`, `picks` (`[{ entryId, label, rank }]`), `predictionEntryId`               |
| `leagues.json`     | a friend group                  | `name`, `inviteCode`, `memberIds`                                                                |

Tips:

- **Back up** by copying the `data/` folder. **Start over** with `npm run reset-data`.
- If you edit a file by hand, keep it valid JSON. A missing comma will make the server return errors until you fix it.
- If the data grows too big for JSON files, `server/store.ts` is the only file that reads or writes them. Swap its two functions (`readTable`, `writeTable`) for SQLite or anything else and the rest of the app won't notice.

---

## Sample players and built-in questions

Both live in **`server/sample-data.ts`**.

- **`PRESET_TOPICS`** is the daily rotation of 7 questions. Each has a `samplePicks` list. When a day's question is created, every sample player picks 5 items from that list (items near the top get picked more often) and some of them guess the #1.
- **Add a question to the rotation:** add another `{ title, description, samplePicks }` object. Give it at least 5 sample picks, or 10 for more variety.
- **Turn the sample players off:** set `ADD_SAMPLE_PLAYERS = false`, then run `npm run reset-data`.
- **Questions from the Topic planner** don't get sample answers, because there's no answer list for the sample players to choose from. Saving a new question over a day that only has sample answers clears those answers.

---

## How scoring works

All of this is in `server/game.ts`.

- **Crowd leaderboard:** a #1 pick earns 5 points, #2 earns 4, and so on down to 1 point for #5. Ties go to the pick with more #1 votes, then alphabetical order.
- **Hot take score (0–100):** how far your list is from the crowd. 65% comes from picking rare things, 35% from ranking things differently than everyone else. 0 means you agreed with everyone; 100 means nobody else picked anything you picked.
- **Prediction:** your guess for the crowd's #1. It's marked right or wrong once the day closes.
- **Streak:** days in a row you've submitted. Today counts if you've played. If you haven't played yet, the streak counts back from yesterday.
- **"Closest list" in leagues:** 70% from how many of the same items you share, 30% from how similarly you ranked them.
- **Spelling matching:** answers are compared lower-cased, with punctuation and accents removed. Small typos in longer answers also count, e.g. "Spirted Away" matches "Spirited Away" (at least 86% similar, 5+ letters). Every spelling someone types is saved as an alias of the matched answer.

---

## Common changes

**Change the colors or fonts:** edit the variables at the top of `src/index.css`. `:root` is light mode and `.dark` is dark mode. Colors are written as `hue saturation% lightness%`.

**Add a new page:**

1. Create `src/pages/MyPage.tsx` and export a component.
2. Add a `<Route path="/my-page" component={MyPage} />` in `src/App.tsx`.
3. Add it to `NAV_ITEMS` in `src/components/Layout.tsx` so it appears in the top bar.

**Add a new piece of data from the server:**

1. Describe its shape in `shared/types.ts`.
2. Add a route in `server/routes.ts` (copy an existing `router.get(...)`).
3. Add a hook in `src/api.ts`, e.g. `export const useThing = () => useQuery({ queryKey: ['thing'], queryFn: () => request<Thing>('/thing') });`
4. Use it in a page: `const { data, isLoading, isError } = useThing();`

**Change the server port:** set `API_PORT`, e.g. on PowerShell: `$env:API_PORT=4000; npm run dev`. The website's `/api` forwarding uses the same variable.

---

## Troubleshooting

| Problem                                                | Fix                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Welcome page says **"Can't reach the local server"**   | The server isn't running, or it's still starting. It reconnects by itself every 2 seconds. Check the terminal for `[server]` errors. |
| **Port 5173 or 3001 is already in use**                | Another copy is probably running. Close that terminal, or change the port (see above).                                               |
| Errors after editing a file in `data/`                 | The JSON is probably broken. Fix the file or run `npm run reset-data`.                                                               |
| Stuck as a player who no longer exists (after a reset) | Nothing to do: the app notices and shows the welcome page again.                                                                     |
| Today's question looks like yesterday's                | Days follow UTC, so the question changes at midnight UTC, not your local midnight.                                                   |

---

## Before putting this online

This build is meant for one computer. Anyone who can open the site can act as any player and use the Topic planner. If you ever host it for real users, you'll want:

1. Real sign-in (and a check on who can use the Topic planner).
2. A proper database instead of JSON files (only `server/store.ts` needs to change).
3. Rate limiting and stricter input checks in `server/routes.ts`.

---

## What changed from the Replit version

- 8 pnpm workspace packages became **one npm project**.
- **Clerk / Google sign-in is gone.** It's replaced by the local player picker.
- **PostgreSQL + Drizzle are replaced by JSON files** in `data/`.
- The **OpenAPI spec and its generated clients/validators are gone.** Types live in `shared/types.ts`, and API calls are hand-written in `src/api.ts`.
- **Replit-only files are gone:** `.replit`, `replit.md`, `.agents/`, the Replit Vite plugins, the mockup sandbox, and ~55 unused UI component files.
- The 570-line `App.tsx` was **split into one file per page**.
- The admin page became the **Topic planner** and is open to everyone. Its unused "suggestion category" field was removed.
- **Small fixes:** dates no longer show the wrong day in some time zones, the cursor jumps to the next empty slot after you add a pick, typing part of an answer ("shr") now suggests "Shrek 2", and invite codes are shown on league cards so you can share them.
