/**
 * @fileoverview Controller for handling AI-related operations.
 * Handles generating travel interest tags based on user input.
 * @module AIController
 */

import AIService from "../services/ai.service.js";

/**
 * Controller class for handling AI operations.
 * @class
 */
class AIController {

	/**
	 * Generates travel interest tags based on user input.
	 * @param {Object} req - Express request object.
	 * @param {Object} res - Express response object.
	 * @returns {Promise<void>}
	 */
	static async generateTags(req, res) {
		try {
			const {input} = req.body;

			// Input validation
			if (!input || typeof input !== 'string' || input.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid input. A non-empty string field "input" is required.',
					statusCode: 400
				});
			}

			// Define the JSON schema for the response
			const json_schema = {
				"type": "object",
				"properties": {
					"tags": {
						"type": "array",
						"items": {
							"type": "string"
						}
					}
				},
				"required": ["tags"],
				"additionalProperties": false
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Extract travel interest tags based on the user input.',
				prompt: input,
				json_schema_name: 'travel_tags',
				json_schema: json_schema
			};

			// Call AIService to generate tags
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);

			console.info('AI response:', result.data.choices[0].message.content)
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if (parsed) {
				return res.respond({
					data: parsed,
					message: 'Tags generated successfully.',
					statusCode: 200
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403
				});
			}

		} catch (error) {
			console.error('Error in generateTags:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error generating tags.',
				statusCode: 500
			});
		}
	}
}

export default AIController;
