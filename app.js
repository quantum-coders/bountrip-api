import primate from '@thewebchimp/primate';
import { router as bounties } from './routes/bountrip.js';


primate.setup();
await primate.start();

primate.app.use('/bounties', bounties);
