// near.service.js
import {
  connect,
  keyStores,
  utils,
  transactions,
  providers,
} from 'near-api-js';

/**
 * @class NearService
 * @description A utility class for creating and encoding NEAR blockchain transactions.
 * All methods are static and can be used without instantiating the class.
 * This class is intended for backend use only to generate transactions without handling private keys.
 */
class NearService {
  /**
   * @private
   * @static
   * @description The NEAR connection instance.
   */
  static nearConnection = null;

  /**
   * @private
   * @static
   * @description Initializes the NEAR connection if not already initialized.
   *
   * @param {string} networkId - The NEAR network ID (e.g., 'testnet', 'mainnet').
   *
   * @returns {Promise<void>} - Resolves cuando la conexión está establecida.
   */
  static async _initConnection(networkId) {
    if (!NearService.nearConnection) {
      console.info(`Initializing NEAR connection for network: ${networkId}`);
      const config = {
        networkId,
        nodeUrl: `https://rpc.${networkId}.near.org`,
        walletUrl: `https://wallet.${networkId}.near.org`,
        helperUrl: `https://helper.${networkId}.near.org`,
        explorerUrl: `https://explorer.${networkId}.near.org`,
        keyStore: new keyStores.InMemoryKeyStore(), // No keys stored here
      };

      try {
        NearService.nearConnection = await connect(config);
        console.info('NEAR connection established.');
      } catch (error) {
        console.error(`Failed to connect to NEAR network: ${error.message}`);
        throw new Error(`Failed to connect to NEAR network: ${error.message}`);
      }
    } else {
      console.info('NEAR connection already initialized.');
    }
  }

  /**
   * @private
   * @static
   * @description Retrieves the public key associated with the sender's account.
   *
   * @param {string} networkId - The NEAR network ID.
   * @param {string} sender - The sender's account ID.
   *
   * @returns {Promise<PublicKey>} - La clave pública como una instancia de PublicKey.
   *
   * @throws {Error} - Lanza un error si no se encuentran claves de acceso o si falla la recuperación.
   */
  static async _getSignerPublicKey(networkId, sender) {
    try {
      console.info(`Retrieving public keys for account: ${sender} on network: ${networkId}`);
      const provider = NearService.nearConnection.connection.provider;

      // Initialize the account object
      const account = await NearService.nearConnection.account(sender);

      // Fetch all access keys for the sender account
      const accessKeys = await account.getAccessKeys();
      console.info(`Found ${accessKeys.length} access key(s) for account: ${sender}`);

      if (!accessKeys || accessKeys.length === 0) {
        throw new Error(`No access keys found for account: ${sender}`);
      }

      // Seleccionar la primera clave pública (puedes modificar esta lógica según tus necesidades)
      const signerPublicKeyStr = accessKeys[0].public_key;
      const signerPublicKey = utils.PublicKey.from(signerPublicKeyStr); // Conversión a PublicKey
      console.info(`Using public key: ${signerPublicKeyStr} for transaction signing.`);
      return signerPublicKey;
    } catch (error) {
      console.error(`Error retrieving public key for ${sender}: ${error.message}`);
      throw new Error(`Failed to retrieve public key for ${sender}: ${error.message}`);
    }
  }

  /**
   * Creates an unsigned transfer transaction.
   *
   * @param {Object} params - The parameters para la transacción de transferencia.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor.
   * @param {string} params.amount - La cantidad a transferir en NEAR (ej., '1.5').
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción de transferencia sin firmar.
   *
   * @throws {Error} - Lanza un error si el formato de la cantidad es inválido o si falla la creación de la transacción.
   */
  static async createTransferTransaction({ networkId, sender, receiver, amount }) {
    console.info('Creating transfer transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      amount,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Parse the amount to Yocto NEAR
    const yoctoAmount = utils.format.parseNearAmount(amount);
    if (!yoctoAmount) {
      console.error('Invalid amount format:', amount);
      throw new Error('Invalid amount format.');
    }
    console.info(`Parsed amount: ${amount} NEAR as ${yoctoAmount} YoctoNEAR.`);

    // Define the transfer action
    const actions = [transactions.transfer(yoctoAmount)];
    console.info('Defined transfer action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({ networkId, sender, receiver, actions });
    console.info('Transfer transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned function call transaction.
   *
   * @param {Object} params - The parameters para la transacción de llamada de función.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor (contrato).
   * @param {string} params.methodName - El nombre del método del contrato a llamar.
   * @param {Object} params.args - Los argumentos para pasar al método del contrato.
   * @param {string} params.gas - La cantidad de gas a adjuntar a la llamada de función (ej., '30000000000000').
   * @param {string} params.deposit - La cantidad de NEAR a adjuntar como depósito (ej., '1.5').
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción de llamada de función sin firmar.
   *
   * @throws {Error} - Lanza un error si el formato de la cantidad de depósito es inválido o si falla la creación de la transacción.
   */
  static async createFunctionCallTransaction({ networkId, sender, receiver, methodName, args, gas, deposit }) {
    console.info('Creating function call transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      methodName,
      args,
      gas,
      deposit,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Parse the deposit amount to Yocto NEAR
    const yoctoDeposit = utils.format.parseNearAmount(deposit);
    if (!yoctoDeposit) {
      console.error('Invalid deposit amount format:', deposit);
      throw new Error('Invalid deposit amount format.');
    }
    console.info(`Parsed deposit: ${deposit} NEAR as ${yoctoDeposit} YoctoNEAR.`);

    // Define the function call action
    const actions = [transactions.functionCall(
      methodName,
      Buffer.from(JSON.stringify(args)),
      gas,
      yoctoDeposit
    )];
    console.info('Defined function call action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({ networkId, sender, receiver, actions });
    console.info('Function call transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned deploy contract transaction.
   *
   * @param {Object} params - The parameters para la transacción de despliegue de contrato.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor (contrato).
   * @param {Buffer} params.contractCode - El código WebAssembly (WASM) compilado del contrato.
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción de despliegue de contrato sin firmar.
   *
   * @throws {Error} - Lanza un error si no se proporciona el código del contrato o si falla la creación de la transacción.
   */
  static async createDeployContractTransaction({ networkId, sender, receiver, contractCode }) {
    console.info('Creating deploy contract transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      contractCode: contractCode.length, // Log the size en lugar del buffer real
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Define the deploy contract action
    const actions = [transactions.deployContract(contractCode)];
    console.info('Defined deploy contract action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({ networkId, sender, receiver, actions });
    console.info('Deploy contract transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned stake transaction.
   *
   * @param {Object} params - The parameters para la transacción de stake.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor.
   * @param {string} params.stake - La cantidad de NEAR para stakear (ej., '1.5').
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción de stake sin firmar.
   *
   * @throws {Error} - Lanza un error si el formato de la cantidad de stake es inválido o si falla la creación de la transacción.
   */
  static async createStakeTransaction({ networkId, sender, receiver, stake }) {
    console.info('Creating stake transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      stake,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Parse the stake amount to Yocto NEAR
    const yoctoStake = utils.format.parseNearAmount(stake);
    if (!yoctoStake) {
      console.error('Invalid stake amount format:', stake);
      throw new Error('Invalid stake amount format.');
    }
    console.info(`Parsed stake: ${stake} NEAR as ${yoctoStake} YoctoNEAR.`);

    // Define the stake action
    const actions = [transactions.stake(yoctoStake)];
    console.info('Defined stake action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({ networkId, sender, receiver, actions });
    console.info('Stake transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned add key transaction.
   *
   * @param {Object} params - The parameters para agregar una clave.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor.
   * @param {string} params.publicKey - La clave pública a agregar (ej., 'ed25519:...').
   * @param {Object} params.accessKey - Los permisos de la clave de acceso.
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción para agregar clave sin firmar.
   *
   * @throws {Error} - Lanza un error si falla la creación de la transacción.
   */
  static async addKeyTransaction({ networkId, sender, receiver, publicKey, accessKey }) {
    console.info('Creating add key transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      publicKey,
      accessKey,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Define the add key action
    const actions = [transactions.addKey(publicKey, accessKey)];
    console.info('Defined add key action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({ networkId, sender, receiver, actions });
    console.info('Add key transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned remove key transaction.
   *
   * @param {Object} params - The parameters para remover una clave.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor.
   * @param {string} params.publicKey - La clave pública a remover (ej., 'ed25519:...').
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción para remover clave sin firmar.
   *
   * @throws {Error} - Lanza un error si falla la creación de la transacción.
   */
  static async removeKeyTransaction({ networkId, sender, receiver, publicKey }) {
    console.info('Creating remove key transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      publicKey,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Define the remove key action
    const actions = [transactions.deleteKey(publicKey)];
    console.info('Defined remove key action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({ networkId, sender, receiver, actions });
    console.info('Remove key transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned transaction with specified actions.
   *
   * @param {Object} params - The parameters para la transacción.
   * @param {string} params.networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   * @param {string} params.sender - El ID de cuenta del remitente.
   * @param {string} params.receiver - El ID de cuenta del receptor.
   * @param {Array<Object>} params.actions - Un array de acciones de transacción NEAR.
   *
   * @returns {Promise<transactions.Transaction>} - Una promesa que resuelve al objeto de transacción sin firmar.
   *
   * @private
   * @throws {Error} - Lanza un error si falla la creación de la transacción.
   */
  static async _createEncodedTransaction({ networkId, sender, receiver, actions }) {
    try {
      console.info('Creating encoded transaction.');

      // Retrieve signer public key
      const signerPublicKey = await NearService._getSignerPublicKey(networkId, sender);
      console.info(`Signer public key retrieved: ${signerPublicKey.toString()}`);

      // Initialize the JSON RPC provider using the existing provider from the connection
      const provider = NearService.nearConnection.connection.provider;
      console.info('Using existing JSON RPC provider from NEAR connection.');

      // Fetch access key details (nonce and block hash)
      console.info(`Fetching access key details for ${sender} with public key ${signerPublicKey.toString()}`);
      const accessKey = await provider.query(
        `access_key/${sender}/${signerPublicKey.toString()}`,
        ''
      );

      if (!accessKey || typeof accessKey.nonce !== 'number' || !accessKey.block_hash) {
        console.error('Access key information is incomplete or missing.');
        throw new Error('Failed to retrieve access key information.');
      }

      console.info(`Access key details retrieved: nonce=${accessKey.nonce}, block_hash=${accessKey.block_hash}`);

      // Increment the nonce for the new transaction
      const nonce = accessKey.nonce + 1;
      console.info(`Nonce incremented to ${nonce}`);

      // Decode the recent block hash
      const recentBlockHash = utils.serialize.base_decode(accessKey.block_hash);
      console.info('Recent block hash decoded.');

      // Construct the transaction
      const transaction = transactions.createTransaction(
        sender,
        signerPublicKey, // Ahora es una instancia de PublicKey
        receiver,
        nonce,
        actions,
        recentBlockHash
      );
      console.info('Transaction object created.');

      // Return the unsigned transaction object
      return transaction;
    } catch (error) {
      console.error(`Error creating encoded transaction: ${error.message}`);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Serializes an unsigned transaction into base64 format.
   *
   * @param {transactions.Transaction} transaction - El objeto de transacción sin firmar.
   *
   * @returns {string} - La transacción serializada en formato base64.
   *
   * @throws {Error} - Lanza un error si falla la serialización.
   */
  static serializeTransaction(transaction) {
    try {
      console.info('Serializing transaction.');

      // Serialize the transaction using Borsh
      const serializedTx = utils.serialize.serialize(
        transactions.SCHEMA.Transaction,
        transaction
      );
      console.info('Transaction serialized.');

      // Encode the serialized transaction to base64
      const base64Tx = Buffer.from(serializedTx).toString('base64');
      console.info('Transaction encoded to base64.');

      return base64Tx;
    } catch (error) {
      console.error(`Error serializing transaction: ${error.message}`);
      throw new Error(`Failed to serialize transaction: ${error.message}`);
    }
  }

  /**
   * Broadcasts a base64-encoded signed transaction to the NEAR blockchain.
   *
   * @param {string} serializedTransaction - La transacción serializada en formato base64.
   * @param {string} networkId - El ID de la red NEAR (ej., 'testnet', 'mainnet').
   *
   * @returns {Promise<Object>} - Una promesa que resuelve al resultado de la transmisión de la transacción.
   *
   * @throws {Error} - Lanza un error si falla la transmisión de la transacción.
   */
  static async broadcastTransaction(serializedTransaction, networkId) {
    console.info('Broadcasting signed transaction.');

    // Validate essential parameters
    if (!serializedTransaction || !networkId) {
      console.error('Missing serializedTransaction or networkId.');
      throw new Error('Missing essential parameters to broadcast the transaction.');
    }

    try {
      // Initialize connection
      await NearService._initConnection(networkId);
      console.info('NEAR connection initialized for broadcasting.');

      // Initialize the JSON RPC provider using the existing provider from the connection
      const provider = NearService.nearConnection.connection.provider;
      console.info('Using existing JSON RPC provider from NEAR connection.');

      // Broadcast the transaction using the 'broadcast_tx_commit' RPC method
      console.info('Sending broadcast_tx_commit RPC call.');
      const result = await provider.sendJsonRpc('broadcast_tx_commit', [
        serializedTransaction,
      ]);
      console.info('Transaction broadcasted successfully.');
      return result;
    } catch (error) {
      console.error(`Error broadcasting transaction: ${error.message}`);
      throw new Error(`Failed to broadcast transaction: ${error.message}`);
    }
  }

  /**
   * Additional methods for creating other types of transactions can be added here.
   * Ensure that these methods utilize the _createEncodedTransaction method to maintain encapsulation and avoid code repetition.
   */

  //////////////// Bountrip  functions //////////////////////

/**
   * Creates an unsigned function call transaction for the create_bounty method.
   *
   * @param {Object} params - Parameters for the transaction.
   * @param {string} params.networkId - NEAR network ID ('testnet' or 'mainnet').
   * @param {string} params.sender - Sender's account ID.
   * @param {string} params.receiver - Contract account ID.
   * @param {Array<string>} params.prizes - Array of prize amounts in yoctoNEAR as strings.
   *
   * @returns {Promise<transactions.Transaction>} - Unsigned transaction object.
   */
  static async createBountyTransaction({ networkId, sender, receiver, prizes }) {
    console.info('Creating create_bounty transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      prizes,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Calculate total prize
    let totalPrize = BigInt(0);
    for (let prize of prizes) {
      totalPrize += BigInt(prize);
    }
    const totalPrizeString = totalPrize.toString();
    console.info(`Total prize calculated: ${totalPrizeString} yoctoNEAR`);

    // Define function call action
    const actions = [
      transactions.functionCall(
        'create_bounty',
        Buffer.from(JSON.stringify({ prizes })),
        '300000000000000', // 300 Tgas
        totalPrizeString // Attach total prize as deposit
      ),
    ];
    console.info('Defined create_bounty function call action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({
      networkId,
      sender,
      receiver,
      actions,
    });
    console.info('create_bounty transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned function call transaction for the participate method.
   *
   * @param {Object} params - Parameters for the transaction.
   * @param {string} params.networkId - NEAR network ID ('testnet' or 'mainnet').
   * @param {string} params.sender - Sender's account ID.
   * @param {string} params.receiver - Contract account ID.
   * @param {number} params.bountyId - The ID of the bounty to participate in.
   *
   * @returns {Promise<transactions.Transaction>} - Unsigned transaction object.
   */
  static async participateTransaction({ networkId, sender, receiver, bountyId }) {
    console.info('Creating participate transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      bountyId,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Define function call action
    const actions = [
      transactions.functionCall(
        'participate',
        Buffer.from(JSON.stringify({ bountyId })),
        '300000000000000', // 300 Tgas
        '0' // No deposit required
      ),
    ];
    console.info('Defined participate function call action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({
      networkId,
      sender,
      receiver,
      actions,
    });
    console.info('participate transaction created successfully.');
    return transaction;
  }

  /**
   * Creates an unsigned function call transaction for the finalize_bounty method.
   *
   * @param {Object} params - Parameters for the transaction.
   * @param {string} params.networkId - NEAR network ID ('testnet' or 'mainnet').
   * @param {string} params.sender - Sender's account ID.
   * @param {string} params.receiver - Contract account ID.
   * @param {number} params.bountyId - The ID of the bounty to finalize.
   * @param {Array<string>} params.winners - Array of winner account IDs.
   *
   * @returns {Promise<transactions.Transaction>} - Unsigned transaction object.
   */
  static async finalizeBountyTransaction({ networkId, sender, receiver, bountyId, winners }) {
    console.info('Creating finalize_bounty transaction with the following parameters:', {
      networkId,
      sender,
      receiver,
      bountyId,
      winners,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    // Define function call action
    const actions = [
      transactions.functionCall(
        'finalize_bounty',
        Buffer.from(JSON.stringify({ bountyId, winners })),
        '300000000000000', // 300 Tgas
        '0' // No deposit required
      ),
    ];
    console.info('Defined finalize_bounty function call action.');

    // Create and return the unsigned transaction
    const transaction = await NearService._createEncodedTransaction({
      networkId,
      sender,
      receiver,
      actions,
    });
    console.info('finalize_bounty transaction created successfully.');
    return transaction;
  }

  /**
   * Calls the view method get_bounty to retrieve bounty details.
   *
   * @param {Object} params - Parameters for the view function.
   * @param {string} params.networkId - NEAR network ID ('testnet' or 'mainnet').
   * @param {string} params.contractId - Contract account ID.
   * @param {number} params.bountyId - The ID of the bounty to retrieve.
   *
   * @returns {Promise<Object>} - The bounty details.
   */
  static async getBounty({ networkId, contractId, bountyId }) {
    console.info('Calling get_bounty view function with parameters:', {
      networkId,
      contractId,
      bountyId,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    try {
      const account = await NearService.nearConnection.account(contractId);
      const bounty = await account.viewFunction(contractId, 'get_bounty', { bountyId });
      console.info('Retrieved bounty details successfully.');
      return bounty;
    } catch (error) {
      console.error(`Error calling get_bounty: ${error.message}`);
      throw new Error(`Failed to retrieve bounty: ${error.message}`);
    }
  }

  /**
   * Calls the view method get_all_bounties to retrieve all bounties.
   *
   * @param {Object} params - Parameters for the view function.
   * @param {string} params.networkId - NEAR network ID ('testnet' or 'mainnet').
   * @param {string} params.contractId - Contract account ID.
   *
   * @returns {Promise<Array>} - An array of all bounties.
   */
  static async getAllBounties({ networkId, contractId }) {
    console.info('Calling get_all_bounties view function with parameters:', {
      networkId,
      contractId,
    });

    // Initialize connection
    await NearService._initConnection(networkId);

    try {
      const account = await NearService.nearConnection.account(contractId);
      const bounties = await account.viewFunction(contractId, 'get_all_bounties', {});
      console.info('Retrieved all bounties successfully.');
      return bounties;
    } catch (error) {
      console.error(`Error calling get_all_bounties: ${error.message}`);
      throw new Error(`Failed to retrieve bounties: ${error.message}`);
    }
  }



}

export default NearService;
