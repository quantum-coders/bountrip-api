import { auth, Primate } from '@thewebchimp/primate';
import UserController from './user.controller.js';
const router = Primate.getRouter();

// Functions -----------------------------------------------------------------------------------------------------------

// me
router.get('/me', auth, UserController.me);

// register a new user
router.post('/register', UserController.register);

// login
router.post('/login', UserController.login);

// get user avatar
router.get('/:id/avatar', UserController.avatar);

// connect
router.post('/connect', UserController.connect);

// Get bounties
router.get('/:id/bounties', UserController.getBounties);

// ---------------------------------------------------------------------------------------------------------------------

Primate.setupRoute('user', router, {
	searchField: [ 'username' ],
	queryableFields: [ 'nicename', 'email' ],
});
export { router };