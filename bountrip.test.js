import NearService from './services/near.service.js';

(async () => {
    const networkId = 'testnet';
    const contractId = 'quantum-coders.testnet';
    const sender = 'quantum-coders.testnet';
    const receiver = contractId;

    try {
        // 1. Crear una bounty
        console.log('\n1. Creando una bounty...');
        const prizes = ['1', '0.5'];
        const createBountyTx = await NearService.createBountyTransaction({
            networkId,
            sender,
            receiver,
            prizes,
        });
        console.log('Transacción de create_bounty creada:', createBountyTx);

        // Formatear la transacción para visualización
        const formattedCreateBountyTx = NearService.formatTransactionForResponse(createBountyTx);
        console.log('Transacción formateada:', JSON.stringify(formattedCreateBountyTx, null, 2));

        // 2. Participar en una bounty
        console.log('\n2. Participando en una bounty...');
        const participateTx = await NearService.participateTransaction({
            networkId,
            sender: 'participant1.testnet',
            receiver,
            bountyId: 0,
        });
        console.log('Transacción de participate creada:', participateTx);

        // Formatear la transacción para visualización
        const formattedParticipateTx = NearService.formatTransactionForResponse(participateTx);
        console.log('Transacción formateada:', JSON.stringify(formattedParticipateTx, null, 2));

        // 3. Finalizar una bounty
        console.log('\n3. Finalizando una bounty...');
        const finalizeBountyTx = await NearService.finalizeBountyTransaction({
            networkId,
            sender,
            receiver,
            bountyId: 0,
            winners: ['participant1.testnet'],
        });
        console.log('Transacción de finalize_bounty creada:', finalizeBountyTx);

        // Formatear la transacción para visualización
        const formattedFinalizeBountyTx = NearService.formatTransactionForResponse(finalizeBountyTx);
        console.log('Transacción formateada:', JSON.stringify(formattedFinalizeBountyTx, null, 2));

        // 4. Obtener todas las bounties
        console.log('\n4. Obteniendo todas las bounties...');
        const allBounties = await NearService.getAllBounties({networkId, contractId});
        console.log('Todas las bounties:', allBounties);

        // 5. Obtener una bounty específica
        console.log('\n5. Obteniendo una bounty específica...');
        const specificBounty = await NearService.getBounty({networkId, contractId, bountyId: 0});
        console.log('Bounty específica:', specificBounty);

        // 6. Obtener bounties de un participante
        console.log('\n6. Obteniendo bounties de un participante...');
        const participantBounties = await NearService.getParticipantBounties({
            networkId,
            contractId,
            participantId: 'participant_comet22.testnet',
        });
        console.log('Bounties del participante: participant_comet22.testnet', participantBounties);

        // 7. Obtener bounties de un creador
        console.log('\n7. Obteniendo bounties de un creador...');
        const creatorBounties = await NearService.getCreatorBounties({
            networkId,
            contractId,
            creatorId: sender,
        });
        console.log('Bounties del creador:', creatorBounties);

    } catch (error) {
        console.error('Error durante las pruebas:', error);
    }
})();
