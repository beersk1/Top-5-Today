// `npm run reset-data` — deletes everything in data/. Sample data is recreated on next start.

import { rmSync } from 'node:fs';
import { DATA_DIR } from './store';

rmSync(DATA_DIR, { recursive: true, force: true });
console.log(`Deleted ${DATA_DIR}. Start the app again to get fresh sample data.`);
