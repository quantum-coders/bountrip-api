import primate from '@thewebchimp/primate';
import { router as bounties } from './routes/bountrip.js';
import { router as ai } from './routes/ai.js';
import '#utils/typedef.js';

await primate.setup();
await primate.start();

primate.app.use('/bounties', bounties);
primate.app.use('/ai', ai);
