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
	static async createTransferTransaction({networkId, sender, receiver, amount}) {
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
		const transaction = await NearService._createEncodedTransaction({networkId, sender, receiver, actions});
		console.info('Transfer transaction created successfully.');
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
	static async _createEncodedTransaction({networkId, sender, receiver, actions}) {
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

	static formatTransactionForResponse(transaction) {
    try {
        const formattedTransaction = {
            signerId: transaction.signerId,
            receiverId: transaction.receiverId,
            publicKey: transaction.publicKey.toString(),
            nonce: transaction.nonce.toString(),
            actions: transaction.actions.map(action => {
                // Map the action type to PascalCase
                let actionType;
                switch (action.enum) {
                    case 'functionCall':
                    case 'function_call':
                    case 'FunctionCall':
                        actionType = 'FunctionCall';
                        break;
                    // Add other action types if necessary
                    default:
                        throw new Error(`Unsupported action type: ${action.enum}`);
                }

                return {
                    type: actionType,
                    params: {
                        methodName: action.functionCall?.methodName,
                        args: action.functionCall?.args
                            ? JSON.parse(Buffer.from(action.functionCall.args).toString())
                            : undefined,
                        gas: action.functionCall?.gas.toString(),
                        deposit: action.functionCall?.deposit.toString()
                    }
                };
            }),
            blockHash: Array.from(transaction.blockHash)
        };

        return formattedTransaction;
    } catch (error) {
        console.error('Error formatting transaction:', error);
        throw new Error('Failed to format transaction for response');
    }
}




	static async createBountyTransaction({networkId, sender, receiver, prizes}) {
		console.info('Creating create_bounty transaction with the following parameters:', {
			networkId, sender, receiver, prizes,
		});

		await NearService._initConnection(networkId);

		// Convert prizes from NEAR to yoctoNEAR
		const yoctoPrizes = prizes.map(prize => utils.format.parseNearAmount(prize));

		let totalPrize = BigInt(0);
		for (let prize of yoctoPrizes) {
			totalPrize += BigInt(prize);
		}
		const totalPrizeString = totalPrize.toString();

		const actions = [
			transactions.functionCall(
				'create_bounty',
				Buffer.from(JSON.stringify({prizes: yoctoPrizes})),
				'300000000000000', // 300 Tgas
				totalPrizeString
			),
		];

		const transaction = await NearService._createEncodedTransaction({
			networkId, sender, receiver, actions,
		});
		console.info('create_bounty transaction created successfully.');
		return transaction;
	}

	static async participateTransaction({networkId, sender, receiver, bountyId}) {
		console.info('Creating participate transaction with the following parameters:', {
			networkId, sender, receiver, bountyId,
		});

		await NearService._initConnection(networkId);

		const actions = [
			transactions.functionCall(
				'participate',
				Buffer.from(JSON.stringify({bountyId})),
				'300000000000000', // 300 Tgas
				'0' // No deposit required
			),
		];

		const transaction = await NearService._createEncodedTransaction({
			networkId, sender, receiver, actions,
		});
		console.info('participate transaction created successfully.');
		return transaction;
	}

	static async finalizeBountyTransaction({networkId, sender, receiver, bountyId, winners}) {
		console.info('Creating finalize_bounty transaction with the following parameters:', {
			networkId, sender, receiver, bountyId, winners,
		});

		await NearService._initConnection(networkId);

		const actions = [
			transactions.functionCall(
				'finalize_bounty',
				Buffer.from(JSON.stringify({bountyId, winners})),
				'300000000000000', // 300 Tgas
				'0' // No deposit required
			),
		];

		const transaction = await NearService._createEncodedTransaction({
			networkId, sender, receiver, actions,
		});
		console.info('finalize_bounty transaction created successfully.');
		return transaction;
	}

	static async getParticipantBounties({networkId, contractId, participantId}) {
		console.info('Calling get_participant_bounties view function with parameters:', {
			networkId, contractId, participantId,
		});

		await NearService._initConnection(networkId);

		try {
			const account = await NearService.nearConnection.account(contractId);
			const bounties = await account.viewFunction({
				contractId: contractId,
				methodName: 'get_participant_bounties',
				args: {participantId}  // Change 'participantId' to 'account_id'
			});
			console.info('Retrieved participant bounties successfully.');
			return bounties;
		} catch (error) {
			console.error(`Error calling get_participant_bounties: ${error.message}`);
			throw new Error(`Failed to retrieve participant bounties: ${error.message}`);
		}
	}

	static async getCreatorBounties({networkId, contractId, creatorId}) {
		console.info('Calling get_creator_bounties view function with parameters:', {
			networkId, contractId, creatorId,
		});

		await NearService._initConnection(networkId);

		try {
			const account = await NearService.nearConnection.account(contractId);
			const bounties = await account.viewFunction({
				contractId: contractId,
				methodName: 'get_creator_bounties',
				args: {creatorId: creatorId}  // Cambiado a 'creatorId'
			});
			console.info('Retrieved creator bounties successfully.');
			return bounties;
		} catch (error) {
			console.error(`Error calling get_creator_bounties: ${error.message}`);
			throw new Error(`Failed to retrieve creator bounties: ${error.message}`);
		}
	}

	static async getAllBounties({networkId, contractId}) {
		console.info('Calling get_all_bounties view function with parameters:', {
			networkId, contractId,
		});

		await NearService._initConnection(networkId);

		try {
			const provider = NearService.nearConnection.connection.provider;
			const result = await provider.query({
				request_type: "call_function",
				account_id: contractId,
				method_name: "get_all_bounties",
				args_base64: Buffer.from("{}").toString("base64"),
				finality: "optimistic"
			});

			if (result.result) {
				const decodedResult = JSON.parse(Buffer.from(result.result).toString());
				console.info('Retrieved all bounties successfully.');
				return decodedResult;
			}
			return [];
		} catch (error) {
			console.error(`Error calling get_all_bounties: ${error.message}`);
			throw new Error(`Failed to retrieve bounties: ${error.message}`);
		}
	}

	static async getBounty({networkId, contractId, bountyId}) {
		console.info('Calling get_bounty view function with parameters:', {
			networkId,
			contractId,
			bountyId,
		});

		// Initialize connection
		await NearService._initConnection(networkId);

		try {
			const account = await NearService.nearConnection.account(contractId);
			// Use the contract's account to call the view function
			const bounty = await account.viewFunction({
				contractId: contractId,
				methodName: 'get_bounty',
				args: {bountyId: bountyId}
			});
			console.info('Retrieved bounty details successfully.');
			return bounty;
		} catch (error) {
			console.error(`Error calling get_bounty: ${error.message}`);
			throw new Error(`Failed to retrieve bounty: ${error.message}`);
		}
	}

}

export default NearService;
