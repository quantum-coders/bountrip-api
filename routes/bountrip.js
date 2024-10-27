import BountripController from '../controllers/bountrip.controller.js';
import { getRouter } from '@thewebchimp/primate';

const router = getRouter();

// Route to create a new bounty
router.post('/', BountripController.createBounty);

// Route to participate in a bounty
router.post('/:id/participate', BountripController.participate);

// Route to finalize a bounty
router.post('/:id/finalize', BountripController.finalizeBounty);

// Route to get details of a specific bounty
router.get('/:id', BountripController.getBounty);

// Route to get all bounties
router.get('/', BountripController.getAllBounties);


export { router };
