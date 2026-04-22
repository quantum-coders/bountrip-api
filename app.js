import primate from '@thewebchimp/primate';
import rateLimit from 'express-rate-limit';
import { router as bounties } from './routes/bountrip.js';
import { router as ai } from './routes/ai.js';
import '#utils/typedef.js';

await primate.setup();
primate.app.set('trust proxy', 1);
await primate.start();

const globalRateLimiter = rateLimit({
	windowMs: 24 * 60 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false },
	message: { result: 'error', status: 429, message: 'Daily request limit reached (100/day). Try again tomorrow.' },
});
primate.app.use(globalRateLimiter);

primate.app.use('/bounties', bounties);
primate.app.use('/ai', ai);
