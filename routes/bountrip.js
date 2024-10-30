import BountripController from '../controllers/bountrip.controller.js';
import {Primate} from '@thewebchimp/primate';
const router = Primate.getRouter();

router.get('/', BountripController.getAllBounties);

router.get('/creator/:creatorId', BountripController.getCreatorBounties);

router.get('/participant/:participantId', BountripController.getParticipantBounties);

router.get('/latest', BountripController.getLatestBounty);

router.get('/interactions', BountripController.getInteractions);

router.post('/plans', BountripController.createPlan);

router.get('/:idBounty/plans', BountripController.getPlansByBountyId);

router.get('/users/:idNear/plans', BountripController.getPlansByIdNear);

router.get('/:id', BountripController.getBounty);

router.post('/', BountripController.createBounty);

router.post('/:id/participate', BountripController.participate);

router.post('/:id/finalize', BountripController.finalizeBounty);

router.post('/store', BountripController.store);

export {router};
