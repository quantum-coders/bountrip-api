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
      const { sender, receiver, prizes } = req.body;
      const networkId = process.env.NETWORK_ID;

      // Validations
      if (!networkId || !sender || !receiver || !Array.isArray(prizes) || prizes.length === 0) {
        return res.respond({
          data: null,
          message: 'Invalid parameters. Please provide sender, receiver, and a non-empty array of prizes.',
          statusCode: 400
        });
      }

      // Validate that each prize is a numeric string
      for (const prize of prizes) {
        if (typeof prize !== 'string' || !/^\d+$/.test(prize)) {
          return res.respond({
            data: null,
            message: 'Each prize must be a string representing a number in yoctoNEAR.',
            statusCode: 400
          });
        }
      }

      // Create transaction
      const transaction = await NearService.createBountyTransaction({ networkId, sender, receiver, prizes });

      // Serialize the transaction
      const serializedTx = NearService.serializeTransaction(transaction);

      // Here you should handle signing the transaction with the corresponding private key
      // For security reasons, this is typically handled in a secure backend environment or via a wallet.

      // Broadcast the transaction
      const broadcastResult = await NearService.broadcastTransaction(serializedTx, networkId);

      // Respond with the broadcast result
      return res.respond({
        data: broadcastResult,
        message: 'Bounty created successfully.',
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
      const { sender, receiver, bountyId } = req.body;
      const networkId = process.env.NETWORK_ID;

      // Validations
      if (!networkId || !sender || !receiver || typeof bountyId !== 'number') {
        return res.respond({
          data: null,
          message: 'Invalid parameters. Please provide sender, receiver, and a valid bountyId.',
          statusCode: 400
        });
      }

      // Create transaction
      const transaction = await NearService.participateTransaction({ networkId, sender, receiver, bountyId });

      // Serialize the transaction
      const serializedTx = NearService.serializeTransaction(transaction);

      // Handle signing and broadcasting the transaction
      const broadcastResult = await NearService.broadcastTransaction(serializedTx, networkId);

      // Respond with the broadcast result
      return res.respond({
        data: broadcastResult,
        message: 'Participation successful.',
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
      const { sender, receiver, bountyId, winners } = req.body;
      const networkId = process.env.NETWORK_ID;

      // Validations
      if (!networkId || !sender || !receiver || typeof bountyId !== 'number' || !Array.isArray(winners) || winners.length === 0) {
        return res.respond({
          data: null,
          message: 'Invalid parameters. Please provide sender, receiver, bountyId, and a non-empty array of winners.',
          statusCode: 400
        });
      }

      // Validate that each winner is a valid string
      for (const winner of winners) {
        if (typeof winner !== 'string' || winner.trim() === '') {
          return res.respond({
            data: null,
            message: 'Each winner must be a non-empty string representing a valid accountId.',
            statusCode: 400
          });
        }
      }

      // Create transaction
      const transaction = await NearService.finalizeBountyTransaction({ networkId, sender, receiver, bountyId, winners });

      // Serialize the transaction
      const serializedTx = NearService.serializeTransaction(transaction);

      // Handle signing and broadcasting the transaction
      const broadcastResult = await NearService.broadcastTransaction(serializedTx, networkId);

      // Respond with the broadcast result
      return res.respond({
        data: broadcastResult,
        message: 'Bounty finalized successfully.',
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
   * Retrieves details of a specific bounty.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  static async getBounty(req, res) {
    try {
      const { contractId, bountyId } = req.query;
      const networkId = process.env.NETWORK_ID;

      // Validations
      if (!networkId || !contractId || typeof bountyId !== 'number') {
        return res.respond({
          data: null,
          message: 'Invalid parameters. Please provide contractId and a valid bountyId.',
          statusCode: 400
        });
      }

      // Retrieve bounty details
      const bounty = await NearService.getBounty({ networkId, contractId, bountyId });

      if (!bounty) {
        return res.respond({
          data: null,
          message: 'Bounty not found.',
          statusCode: 404
        });
      }

      // Respond with bounty details
      return res.respond({
        data: bounty,
        message: 'Bounty details retrieved successfully.',
        statusCode: 200
      });

    } catch (error) {
      console.error('Error in getBounty:', error);
      return res.respond({
        data: null,
        message: error.message || 'Error retrieving bounty details.',
        statusCode: 500
      });
    }
  }

  /**
   * Retrieves all existing bounties.
   *
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  static async getAllBounties(req, res) {
    try {
      const { contractId } = req.query;
      const networkId = process.env.NETWORK_ID;

      // Validations
      if (!networkId || !contractId) {
        return res.respond({
          data: null,
          message: 'Invalid parameters. Please provide contractId.',
          statusCode: 400
        });
      }

      // Retrieve all bounties
      const bounties = await NearService.getAllBounties({ networkId, contractId });

      // Respond with all bounties
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

}

export default BountripController;
