import NearService from './services/near.service.js';

(async () => {
  const networkId = 'testnet';
  const contractId = 'quantum-coders.testnet'; // Reemplaza con tu contrato
  const sender = 'quantum-coders.testnet'; // Reemplaza con tu cuenta
  const receiver = contractId;

  // Crear una bounty
  const prizes = ['1000000000000000000000000', '500000000000000000000000']; // Premios en yoctoNEAR
  const createBountyTx = await NearService.createBountyTransaction({
    networkId,
    sender,
    receiver,
    prizes,
  });

  // Serializar la transacción
  const serializedCreateBountyTx = NearService.serializeTransaction(createBountyTx);

  // Mostrar la transacción serializada en la consola
  console.log('Transacción serializada de create_bounty:', serializedCreateBountyTx);

  // Participar en una bounty
  const bountyId = 0; // ID de la bounty
  const participateTx = await NearService.participateTransaction({
    networkId,
    sender: 'participante.testnet', // Cuenta del participante
    receiver,
    bountyId,
  });

  // Serializar la transacción
  const serializedParticipateTx = NearService.serializeTransaction(participateTx);

  // Mostrar la transacción serializada en la consola
  console.log('Transacción serializada de participate:', serializedParticipateTx);

  // Finalizar una bounty
  const winners = ['ganador1.testnet', 'ganador2.testnet'];
  const finalizeBountyTx = await NearService.finalizeBountyTransaction({
    networkId,
    sender,
    receiver,
    bountyId,
    winners,
  });

  // Serializar la transacción
  const serializedFinalizeBountyTx = NearService.serializeTransaction(finalizeBountyTx);

  // Mostrar la transacción serializada en la consola
  console.log('Transacción serializada de finalize_bounty:', serializedFinalizeBountyTx);

  // Obtener detalles de una bounty
  const bountyDetails = await NearService.getBounty({
    networkId,
    contractId,
    bountyId,
  });
  console.log('Detalles de la bounty:', bountyDetails);

  // Obtener todas las bounties
  const allBounties = await NearService.getAllBounties({
    networkId,
    contractId,
  });
  console.log('Todas las bounties:', allBounties);
})();
