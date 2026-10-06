// Built-in content: the daily questions that rotate automatically,
// plus the made-up players who answer them so the app never feels empty.

/** Set to false to start with no sample players or sample league (then run `npm run reset-data`). */
export const ADD_SAMPLE_PLAYERS = true;

export const SAMPLE_PLAYER_NAMES = ['Mina', 'Jo', 'Drew', 'Sam', 'Priya', 'Leo', 'Ava', 'Kenji'];

export const SAMPLE_LEAGUE = { name: 'The Sample Crew', inviteCode: 'SAMPLE5' };

export type PresetTopic = {
  title: string;
  description: string;
  /** Sample players pick from this list. Earlier items get picked more often. */
  samplePicks: string[];
};

const DEFAULT_DESCRIPTION = 'Make the case for your real top five. Results unlock when you submit.';

/**
 * One of these is used each day, in order, looping forever.
 * You can schedule a one-off question for any day on the Topic planner page instead.
 */
export const PRESET_TOPICS: PresetTopic[] = [
  {
    title: 'Top 5 movies you can watch over and over',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      'The Dark Knight',
      'Back to the Future',
      'Shrek 2',
      'Spirited Away',
      'The Princess Bride',
      'Toy Story',
      'Mean Girls',
      'Groundhog Day',
      'Jurassic Park',
      'Paddington 2',
    ],
  },
  {
    title: 'Top 5 comfort foods worth craving',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      'Mac and cheese',
      'Pizza',
      'Ramen',
      'Grilled cheese',
      'Butter chicken',
      'Dumplings',
      'Chicken soup',
      'Mashed potatoes',
      'Pancakes',
      'Lasagna',
    ],
  },
  {
    title: 'Top 5 places you want to visit again',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      'Tokyo',
      'Lisbon',
      'New York City',
      'Kyoto',
      'Barcelona',
      'Iceland',
      'Rome',
      'Bali',
      'Cape Town',
      'Vancouver',
    ],
  },
  {
    title: 'Top 5 songs that never get old',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      'Bohemian Rhapsody',
      'Mr. Brightside',
      'September',
      'Dancing Queen',
      'Billie Jean',
      'Hey Ya!',
      'Take On Me',
      "Don't Stop Believin'",
      'Superstition',
      'Africa',
    ],
  },
  {
    title: 'Top 5 fictional characters of all time',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      'Sherlock Holmes',
      'Hermione Granger',
      'Darth Vader',
      'Homer Simpson',
      'Gandalf',
      'Batman',
      'Elizabeth Bennet',
      'Leslie Knope',
      'Tony Stark',
      'Shrek',
    ],
  },
  {
    title: 'Top 5 sporting moments you still remember',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      "Messi's 2022 World Cup win",
      "Usain Bolt's 9.58",
      'Miracle on Ice',
      "Jordan's last shot in '98",
      'Leicester City win the league',
      "Tiger's 2019 Masters",
      'Rumble in the Jungle',
      "Kerri Strug's vault",
      "Federer vs Nadal, Wimbledon '08",
      "Serena's Golden Slam",
    ],
  },
  {
    title: 'Top 5 things that instantly improve a day',
    description: DEFAULT_DESCRIPTION,
    samplePicks: [
      'Good coffee',
      'A long walk',
      'Clean sheets',
      'A text from an old friend',
      'Sunshine',
      'A nap',
      'Finding money in a pocket',
      'Seeing a dog',
      'A cancelled meeting',
      'A great playlist',
    ],
  },
];

/** Picks which preset question belongs to a given day. */
export function presetForDay(day: string): PresetTopic {
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 86_400_000);
  const index = ((dayNumber % PRESET_TOPICS.length) + PRESET_TOPICS.length) % PRESET_TOPICS.length;
  return PRESET_TOPICS[index];
}

/** A random number generator that gives the same sequence for the same seed text. */
export function seededRandom(seedText: string): () => number {
  let seed = 0;
  for (const char of seedText) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
