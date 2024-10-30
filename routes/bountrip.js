import BountripController from '../controllers/bountrip.controller.js';
import { Primate } from '@thewebchimp/primate';

const router = Primate.getRouter();

// Route to get all bounties
router.get('/', BountripController.getAllBounties);

// Route to get bounties by creator
router.get('/creator/:creatorId', BountripController.getCreatorBounties); // Nueva ruta

// Route to get bounties by participant
router.get('/participant/:participantId', BountripController.getParticipantBounties); // Nueva ruta

router.get('/latest', BountripController.getLatestBounty);

router.get('/interactions', BountripController.getInteractions);

router.post('/plans', BountripController.createPlan);
// Route to get details of a specific bounty
router.get('/:id', BountripController.getBounty);

// Route to create a new bounty
router.post('/', BountripController.createBounty);

// Route to participate in a bounty
router.post('/:id/participate', BountripController.participate);

// Route to finalize a bounty
router.post('/:id/finalize', BountripController.finalizeBounty);


router.post('/store', BountripController.store);


export { router };
