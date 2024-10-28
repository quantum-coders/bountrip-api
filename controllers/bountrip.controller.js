import NearService from "../services/near.service.js";
import 'dotenv/config';

class BountripController {

    /**
     * Creates a new bounty.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    static async createBounty(req, res) {
        try {
            const {sender, receiver, prizes} = req.body;
            const networkId = process.env.NETWORK_ID;

            // Validaciones
            if (!networkId || !sender || !receiver || !Array.isArray(prizes) || prizes.length === 0) {
                return res.respond({
                    data: null,
                    message: 'Invalid parameters. Please provide sender, receiver, and a non-empty array of prizes.',
                    statusCode: 400
                });
            }

            // Crear y formatear transacción
            const transaction = await NearService.createBountyTransaction({networkId, sender, receiver, prizes});
            const formattedTransaction = NearService.formatTransactionForResponse(transaction);

            return res.respond({
                data: formattedTransaction,
                message: 'Bounty transaction created successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in createBounty:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error creating the bounty.',
                statusCode: 500
            });
        }
    }

    /**
     * Allows a user to participate in an existing bounty.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    static async participate(req, res) {
        try {
            const {sender, receiver, bountyId} = req.body;
            const networkId = process.env.NETWORK_ID;

            // Validations
            if (!networkId || !sender || !receiver || typeof bountyId !== 'number') {
                return res.respond({
                    data: null,
                    message: 'Invalid parameters. Please provide sender, receiver, and a valid bountyId.',
                    statusCode: 400
                });
            }

            // Create and format transaction
            const transaction = await NearService.participateTransaction({networkId, sender, receiver, bountyId});
            const formattedTransaction = NearService.formatTransactionForResponse(transaction);

            return res.respond({
                data: formattedTransaction,
                message: 'Participate transaction created successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in participate:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error participating in the bounty.',
                statusCode: 500
            });
        }
    }

    /**
     * Finalizes a bounty by specifying the winners.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    static async finalizeBounty(req, res) {
        try {
            const {sender, receiver, bountyId, winners} = req.body;
            const networkId = process.env.NETWORK_ID;

            // Validations
            if (!networkId || !sender || !receiver || typeof bountyId !== 'number' || !Array.isArray(winners) || winners.length === 0) {
                return res.respond({
                    data: null,
                    message: 'Invalid parameters. Please provide sender, receiver, bountyId, and a non-empty array of winners.',
                    statusCode: 400
                });
            }

            // Create and format transaction
            const transaction = await NearService.finalizeBountyTransaction({
                networkId,
                sender,
                receiver,
                bountyId,
                winners
            });
            const formattedTransaction = NearService.formatTransactionForResponse(transaction);

            return res.respond({
                data: formattedTransaction,
                message: 'Finalize bounty transaction created successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in finalizeBounty:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error finalizing the bounty.',
                statusCode: 500
            });
        }
    }

    /**
     * Gets all bounties created by an account.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
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
                    statusCode: 400
                });
            }

            const bounties = await NearService.getCreatorBounties({
                networkId,
                contractId,
                creatorId
            });

            return res.respond({
                data: bounties,
                message: 'Creator bounties retrieved successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in getCreatorBounties:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error retrieving creator bounties.',
                statusCode: 500
            });
        }
    }

    /**
     * Gets all bounties where an account is participating.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
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
                    statusCode: 400
                });
            }

            const bounties = await NearService.getParticipantBounties({
                networkId,
                contractId,
                participantId
            });

            return res.respond({
                data: bounties,
                message: 'Participant bounties retrieved successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in getParticipantBounties:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error retrieving participant bounties.',
                statusCode: 500
            });
        }
    }

    /**
     * Gets all bounties.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    static async getAllBounties(req, res) {
        try {
            const contractId = process.env.CONTRACT_ID;
            const networkId = process.env.NETWORK_ID;

            if (!networkId || !contractId) {
                return res.respond({
                    data: null,
                    message: 'Missing configuration parameters.',
                    statusCode: 500
                });
            }

            const bounties = await NearService.getAllBounties({networkId, contractId});

            return res.respond({
                data: bounties,
                message: 'All bounties retrieved successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in getAllBounties:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error retrieving all bounties.',
                statusCode: 500
            });
        }
    }

    /**
     * Gets a specific bounty.
     *
     * @param {Object} req - Express request object.
     * @param {Object} res - Express response object.
     */
    static async getBounty(req, res) {
        try {
            const {bountyId} = req.params;
            const contractId = process.env.CONTRACT_ID;
            const networkId = process.env.NETWORK_ID;

            if (!networkId || !contractId || !bountyId) {
                return res.respond({
                    data: null,
                    message: 'Invalid parameters. Please provide bountyId.',
                    statusCode: 400
                });
            }

            const bounty = await NearService.getBounty({
                networkId,
                contractId,
                bountyId: parseInt(bountyId)
            });

            if (!bounty) {
                return res.respond({
                    data: null,
                    message: 'Bounty not found.',
                    statusCode: 404
                });
            }

            return res.respond({
                data: bounty,
                message: 'Bounty retrieved successfully.',
                statusCode: 200
            });

        } catch (error) {
            console.error('Error in getBounty:', error);
            return res.respond({
                data: null,
                message: error.message || 'Error retrieving bounty.',
                statusCode: 500
            });
        }
    }
}

export default BountripController;
