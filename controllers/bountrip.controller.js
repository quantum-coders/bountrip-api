/**
 * @fileoverview Controller for managing NEAR blockchain bounty operations.
 * Handles the creation, participation, finalization, and querying of bounties.
 * @module NearController
 */
import primate from '@thewebchimp/primate';
import {v4 as uuidv4} from 'uuid';
import NearService from '../services/near.service.js';
import 'dotenv/config';
import {utils} from 'near-api-js';
import UploadService from "#services/upload.service.js";

/**
 * Controller class for handling NEAR blockchain bounty operations.
 * @class
 */
class NearController {
	static async finalizeBountyInDatabase(req, res) {
		// receives idBounty and set status to Finished
		const {idBounty} = req.body;
		const bounty = await primate.prisma.bounty.update({
			where: {id: parseInt(idBounty)},
			data: {status: 'Finished'},
		});
		return res.respond({
			data: bounty,
			message: 'Bounty finalized successfully.',
			statusCode: 200,
		});
	}

	static async createPlan(req, res) {
		try {
			const {title, description, places, idBounty, idNear} = req.body;

			const user = await primate.prisma.user.findUnique({
				where: {idNear},
			});

			if (!user) {
				return res.respond({
					data: null,
					message: 'User not found.',
					statusCode: 404,
				});
			}
			// Validate required fields
			if (!title || !description || !places || !idBounty) {
				return res.respond({
					data: null,
					message: 'Missing required fields: title, description, places, idBounty',
					statusCode: 400,
				});
			}

			// Create a new plan record
			const newPlan = await primate.prisma.plan.create({
				data: {
					title,
					content: description,
					idBounty: parseInt(idBounty),
					metas: {places},
					idUser: user.id,
					slug: title.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
				},
			});

			const bountyDb = await primate.prisma.bounty.findUnique({
				where: {id: parseInt(idBounty)},
			});
			const dataResult = {
				...newPlan,
				bounty: bountyDb,
			};
			return res.respond({
				data: dataResult,
				message: 'Plan created successfully.',
				statusCode: 201,
			});
		} catch (error) {
			console.error('Error in createPlan:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error creating plan.',
				statusCode: 500,
			});
		}
	}

	static async getLatestBounty(req, res) {
		try {
			const latestBounty = await NearService.getLastBountyId(
				{
					networkId: process.env.NETWORK_ID,
					contractId: process.env.CONTRACT_ID,
				},
			);

			console.info('Latest bounty id is: ', latestBounty);
			return res.respond({
				data: {id: latestBounty},
				message: 'Latest bounty retrieved successfully.',

			});
		} catch (e) {
			console.error(e);
			return res.respond({status: 400, message: e.message});
		}
	}

	static async updateBounty(req, res) {
		try {
			const {idOnChain, idNear, slug, title, content, status, type, metas} = req.body;

			// Validate required fields
			if (!idOnChain || !idNear || !slug) {
				return res.respond({
					data: null,
					message: `Missing required fields: ${!idOnChain ? 'idOnChain' : !idNear ? 'idNear' : 'slug'}`,
					statusCode: 400,
				});
			}

			const user = await primate.prisma.user.findUnique({
				where: {idNear},
			});

			if (!user) {
				return res.respond({
					data: null,
					message: 'User not found.',
					statusCode: 404,
				});
			}

			// Create a new bounty record
			const updatedBounty = await primate.prisma.bounty.update({
				where: {idOnChain},
				data: {
					idUser: user.id,
					slug,
					title,
					content,
					status: status || 'Draft',
					type: type || 'Bounty',
					metas: metas || {},
				},
			});

			return res.respond({
				data: updatedBounty,
				message: 'Bounty updated successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in update:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error updating bounty.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Stores a new bounty or updates an existing one.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.body - Request body
	 * @param {string} req.body.idNear - NEAR account ID of the user
	 * @param {string} req.body.slug - Slug for the bounty
	 * @param {string} req.body.title - Title of the bounty
	 * @param {string} req.body.content - Content/description of the bounty
	 * @param {string} [req.body.status] - Status of the bounty (optional)
	 * @param {string} [req.body.type] - Type of the bounty (optional)
	 * @param {Object} req.body.metas - Metadata for the bounty
	 * @param {Array} req.body.metas.placePhotos - Array of place photos (optional)
	 * @param {string} req.body.idBounty - ID of the bounty
	 * @param {string} [req.body.idOnChain] - On-chain ID of the bounty (optional)
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing the created or updated bounty data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async store(req, res) {
		try {
			const {idNear, slug, title, content, status, type, metas, idBounty} = req.body;
			let {idOnChain} = req.body;

			if (metas.placePhotos && metas.placePhotos.length > 0) {
				for (const photo of metas.placePhotos) {


					const attachmentCreated = await UploadService.createAttachmentFromUrl(photo.url, {
						fileName: uuidv4(),
					});
					photo.url = attachmentCreated.url;
				}

			}

			// Validar campos requeridos
			if (!idNear) {
				return res.respond({
					data: null,
					message: 'Missing required field: idNear',
					statusCode: 400,
				});
			}

			const user = await primate.prisma.user.findUnique({
				where: {idNear},
			});

			if (!user) {
				return res.respond({
					data: null,
					message: 'User not found.',
					statusCode: 404,
				});
			}

			// Intentar obtener la bounty por idOnChain
			let bountyDb = null;
			idOnChain = String(idOnChain);
			console.info('idOnChain: ', idOnChain);
			if (idOnChain && idOnChain !== 'undefined' && idOnChain !== '' && idOnChain !== 'null') {
				console.info('--------------> entra aqui??: ', idOnChain);
				bountyDb = await primate.prisma.bounty.findUnique({
					where: {id: parseInt(idBounty)},
				});
			}

			console.info('--------------> bountyDb: ', bountyDb);
			if (bountyDb) {
				try {
					// Construir el objeto de actualización solo con campos que tengan valores significativos
					const updateData = {
						idUser: user.id,
						...(slug && slug.trim() !== '' && {slug}),
						...(title && title.trim() !== '' && {title}),
						...(content && content.trim() !== '' && {content}),
						...(idOnChain && idOnChain !== 'undefined' && idOnChain !== '' && idOnChain !== 'null' && {idOnChain}),
						...(status && status.trim() !== '' && {status}),
						...(type && type.trim() !== '' && {type}),
						...(metas && Object.keys(metas).length > 0 && {metas}),
					};

					// Solo realizar el update si hay campos para actualizar
					if (Object.keys(updateData).length > 1) { // >1 porque siempre incluimos idUser
						const updatedBounty = await primate.prisma.bounty.update({
							where: {id: parseInt(idBounty)},
							data: updateData,
						});

						return res.respond({
							data: updatedBounty,
							message: 'Bounty updated successfully.',
							statusCode: 200,
						});
					} else {
						// Si no hay campos para actualizar, devolver el bounty existente
						return res.respond({
							data: bountyDb,
							message: 'No fields to update.',
							statusCode: 200,
						});
					}
				} catch (error) {
					console.error('Error in update:', error);
					return res.respond({
						data: null,
						message: error.message || 'Error updating bounty.',
						statusCode: 500,
					});
				}
			}

			// Si no existe el bounty, crear uno nuevo
			const newBountyData = {
				idOnChain: String(idOnChain),
				idUser: user.id,
				slug,
				title,
				content,
				status: status || 'Draft',
				type: type || 'Bounty',
				metas: metas || {},
			};

			const newBounty = await primate.prisma.bounty.create({
				data: newBountyData,
			});

			return res.respond({
				data: newBounty,
				message: 'Bounty created successfully.',
				statusCode: 201,
			});
		} catch (error) {
			console.error('Error in store:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error creating bounty.',
				statusCode: 500,
			});
		}
	}

	static async getInteractions(req, res) {
		try {
			const {accountId} = req.query;
			const networkId = process.env.NETWORK_ID;
			const contractId = process.env.CONTRACT_ID;

			if (!networkId || !contractId) {
				return res.respond({
					data: null,
					message: 'Missing configuration parameters.',
					statusCode: 500,
				});
			}

			const interactions = await NearService.getInteractions({
				networkId,
				contractId,
				accountId,
			});

			return res.respond({
				data: interactions,
				message: 'Interactions retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getInteractions:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving interactions.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Creates a new bounty with specified prizes.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.body - Request body
	 * @param {string} req.body.sender - NEAR account ID of the bounty creator
	 * @param {string} req.body.receiver - Contract account ID that will receive the transaction
	 * @param {string[]} req.body.prizes - Array of prize amounts in NEAR tokens
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing transaction data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async createBounty(req, res) {
		try {
			const {sender, receiver, prizes} = req.body;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !sender || !receiver || !Array.isArray(prizes) || prizes.length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid parameters. Please provide sender, receiver, and a non-empty array of prizes.',
					statusCode: 400,
				});
			}

			const transaction = await NearService.createBountyTransaction({
				networkId,
				sender,
				receiver,
				prizes,
			});

			const formattedTransaction = NearService.formatTransactionForResponse(transaction);

			return res.respond({
				data: formattedTransaction,
				message: 'Bounty transaction created successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in createBounty:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error creating the bounty.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Handles participation in an existing bounty.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.body - Request body
	 * @param {string} req.body.sender - NEAR account ID of the participant
	 * @param {string} req.body.receiver - Contract account ID
	 * @param {number} req.body.bountyId - ID of the bounty to participate in
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing transaction data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async participate(req, res) {
		try {
			const {sender, receiver, bountyId} = req.body;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !sender || !receiver || typeof bountyId !== 'number') {
				return res.respond({
					data: null,
					message: 'Invalid parameters. Please provide sender, receiver, and a valid bountyId.',
					statusCode: 400,
				});
			}

			const transaction = await NearService.participateTransaction({
				networkId,
				sender,
				receiver,
				bountyId,
			});

			const formattedTransaction = NearService.formatTransactionForResponse(transaction);

			return res.respond({
				data: formattedTransaction,
				message: 'Participate transaction created successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in participate:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error participating in the bounty.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Finalizes a bounty by specifying winners.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.body - Request body
	 * @param {string} req.body.sender - NEAR account ID of the bounty creator
	 * @param {string} req.body.receiver - Contract account ID
	 * @param {number} req.body.bountyId - ID of the bounty to finalize
	 * @param {string[]} req.body.winners - Array of NEAR account IDs of winners
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing transaction data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async finalizeBounty(req, res) {
		try {
			const {sender, receiver, bountyId, winners} = req.body;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !sender || !receiver || typeof bountyId !== 'number' || !Array.isArray(winners) || winners.length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid parameters. Please provide sender, receiver, bountyId, and a non-empty array of winners.',
					statusCode: 400,
				});
			}

			const bountyDb = await primate.prisma.bounty.findUnique({
				where: {id: bountyId},
			});

			if (!bountyDb) {
				return res.respond({
					data: null,
					message: 'Bounty not found.',
					statusCode: 404,
				});
			}

			const idOnChain = bountyDb.idOnChain.toString();

			console.info("ID ON CHAIN IS", idOnChain);
			const transaction = await NearService.finalizeBountyTransaction({
				networkId,
				sender,
				receiver,
				bountyId: idOnChain,
				winners,
			});

			const formattedTransaction = NearService.formatTransactionForResponse(transaction);

			// console all the oibject formattedTransaction
			console.log("formattedTX ", JSON.stringify(formattedTransaction));
			return res.respond({
				data: formattedTransaction,
				message: 'Finalize bounty transaction created successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in finalizeBounty:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error finalizing the bounty.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Retrieves all bounties created by a specific account.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.params - Request parameters
	 * @param {string} req.params.creatorId - NEAR account ID of the bounty creator
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing bounties data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async getCreatorBounties(req, res) {
		try {
			const {creatorId} = req.params;
			const contractId = process.env.CONTRACT_ID;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !contractId || !creatorId) {
				return res.respond({
					data: null,
					message: 'Invalid parameters. Please provide creatorId.',
					statusCode: 400,
				});
			}

			const bounties = await NearService.getCreatorBounties({
				networkId,
				contractId,
				creatorId,
			});
			const bountyData = [];
			for (let bounty of bounties) {
				const b = await NearController.completeBountyData(bounty);
				if (!b) continue;
				bountyData.push(b);
			}

			return res.respond({
				data: bountyData,
				message: 'Creator bounties retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getCreatorBounties:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving creator bounties.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Retrieves all bounties where a specific account is participating.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.params - Request parameters
	 * @param {string} req.params.participantId - NEAR account ID of the participant
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing bounties data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async getParticipantBounties(req, res) {
		try {
			const {participantId} = req.params;
			const contractId = process.env.CONTRACT_ID;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !contractId || !participantId) {
				return res.respond({
					data: null,
					message: 'Invalid parameters. Please provide participantId.',
					statusCode: 400,
				});
			}

			const bounties = await NearService.getParticipantBounties({
				networkId,
				contractId,
				participantId,
			});

			const bountyData = [];
			for (let bounty of bounties) {
				const b = await NearController.completeBountyData(bounty);
				if (!b) continue;
				bountyData.push(b);
			}

			return res.respond({
				data: bountyData,
				message: 'Participant bounties retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getParticipantBounties:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving participant bounties.',
				statusCode: 500,
			});
		}
	}

	static async completeBountyData(bounty) {
		const bountyDb = await primate.prisma.bounty.findFirst({
			where: {idOnChain: String(bounty.id)},
		});

		if (bountyDb) {
			// for each bounty prize convert yoctoNear to Near
			bounty.prizes = bounty.prizes.map(prize => utils.format.formatNearAmount(prize));
			bounty.totalPrize = utils.format.formatNearAmount(bounty.totalPrize);
			return {
				...bounty,
				idOnChain: bounty.id,
				id: bountyDb.id,
				title: bountyDb.title,
				content: bountyDb.content,
				status: bountyDb.status,
				type: bountyDb.type,
				metas: bountyDb.metas,
				created: bountyDb.created,
				modified: bountyDb.modified,
			};
		}
	}

	/**
	 * Retrieves all bounties in the system.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing all bounties data or error message
	 * @throws {Error} When required configuration is missing
	 */
	static async getAllBounties(req, res) {
		try {
			const contractId = process.env.CONTRACT_ID;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !contractId) {
				return res.respond({
					data: null,
					message: 'Missing configuration parameters.',
					statusCode: 500,
				});
			}

			const bounties = await NearService.getAllBounties({
				networkId,
				contractId,
			});

			const bountiesData = [];
			for (let bounty of bounties) {
				console.info('--------------> bounty: ', bounty);
				const b = await NearController.completeBountyData(bounty);
				if (!b) continue;
				console.info('--------------> b: ', b);
				// check if totalPrize and prizes are BigNumbers
				/*				b.totalPrize = utils.format.formatNearAmount(b.totalPrize);
								b.prizes = b.prizes.map(prize => utils.format.formatNearAmount(prize));*/
				bountiesData.push(b);
			}

			return res.respond({
				data: bountiesData,
				message: 'All bounties retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getAllBounties:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving all bounties.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Retrieves a specific bounty by ID.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.params - Request parameters
	 * @param {string} req.params.bountyId - ID of the bounty to retrieve
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing bounty data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async getBounty(req, res) {
		try {
			const bountyId = req.params.id;
			const contractId = process.env.CONTRACT_ID;
			const networkId = process.env.NETWORK_ID;

			if (!networkId || !contractId || !bountyId) {
				return res.respond({
					data: null,
					message: 'Invalid parameters. Please provide bountyId.',
					statusCode: 400,
				});
			}

			const bountyDb = await primate.prisma.bounty.findUnique({
				where: {id: parseInt(bountyId)},
			});

			console.info('--------------> bountyDb: ', bountyDb);
			const bounty = await NearService.getBounty({
				networkId,
				contractId,
				bountyId: parseInt(bountyDb.idOnChain),
			});

			console.info('--------------> bounty blockchain: ', bounty);

			const prizes = bounty.prizes.map(prize => utils.format.formatNearAmount(prize));
			const totalPrize = utils.format.formatNearAmount(bounty.totalPrize);
			return res.respond({
				data: {
					...bounty,
					id: bountyDb.id,
					title: bountyDb.title,
					content: bountyDb.content,
					status: bountyDb.status,
					type: bountyDb.type,
					metas: bountyDb.metas,
					created: bountyDb.created,
					modified: bountyDb.modified,
					idOnChain: bountyDb.idOnChain,
					prizes,
					totalPrize,
				},
				message: 'Bounty retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getBounty:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving bounty.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Retrieves all plans associated with a specific bounty ID.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.params - Request parameters
	 * @param {number} req.params.idBounty - ID of the bounty
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing plans data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async getPlansByBountyId(req, res) {
		try {
			const {idBounty} = req.params;

			// Validar que idBounty esté presente y sea un número válido
			if (!idBounty || isNaN(parseInt(idBounty))) {
				return res.respond({
					data: null,
					message: 'Invalid or missing idBounty parameter.',
					statusCode: 400,
				});
			}

			// Verificar que la bounty exista
			const bounty = await primate.prisma.bounty.findUnique({
				where: {id: parseInt(idBounty)},
			});

			if (!bounty) {
				return res.respond({
					data: null,
					message: 'Bounty not found.',
					statusCode: 404,
				});
			}

			// Obtener todos los planes asociados a la bounty
			const plans = await primate.prisma.plan.findMany({
				where: {idBounty: parseInt(idBounty)},
				include: {
					user: {
						select: {
							idNear: true,
							username: true,
							email: true,
						},
					},
				},
				orderBy: {
					created: 'desc',
				},
			});

			return res.respond({
				data: plans,
				message: 'Plans retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getPlansByBountyId:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving plans by bounty ID.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Retrieves all plans associated with a specific user's idNear.
	 *
	 * @async
	 * @param {Object} req - Express request object
	 * @param {Object} req.params - Request parameters
	 * @param {string} req.params.idNear - Unique identifier of the user
	 * @param {Object} res - Express response object
	 * @returns {Promise<Object>} Response object containing plans data or error message
	 * @throws {Error} When required parameters are missing or invalid
	 */
	static async getPlansByIdNear(req, res) {
		try {
			const {idNear} = req.params;

			// Validar que idNear esté presente
			if (!idNear || typeof idNear !== 'string') {
				return res.respond({
					data: null,
					message: 'Invalid or missing idNear parameter.',
					statusCode: 400,
				});
			}

			// Verificar que el usuario exista
			const user = await primate.prisma.user.findUnique({
				where: {idNear},
			});

			if (!user) {
				return res.respond({
					data: null,
					message: 'User not found.',
					statusCode: 404,
				});
			}

			// Obtener todos los planes asociados al usuario
			const plans = await primate.prisma.plan.findMany({
				where: {idUser: user.id},
				include: {
					bounty: {
						select: {
							id: true,
							title: true,
							status: true,
						},
					},
				},
				orderBy: {
					created: 'desc',
				},
			});

			return res.respond({
				data: plans,
				message: 'Plans retrieved successfully.',
				statusCode: 200,
			});
		} catch (error) {
			console.error('Error in getPlansByIdNear:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving plans by user ID.',
				statusCode: 500,
			});
		}
	}

}

export default NearController;
