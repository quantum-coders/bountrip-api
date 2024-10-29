import axios from 'axios';
import {promptTokensEstimate} from 'openai-chat-tokens';
import {groqModels, openAIModels, perplexityModels} from '../assets/data/ai-models.js';
import 'dotenv/config';

class AIService {

	/**
	 * Sends a message to the AI model and processes the response.
	 *
	 * @param {Object} data - The data to send to the AI model.
	 * @param {string} provider - The provider of the AI model.
	 * @returns {Promise<Object>} - A promise that resolves to the parsed response from the AI model.
	 * @throws {Error} - Throws an error if there is an issue con la solicitud o la respuesta.
	 */
	static async sendMessage(data, provider) {
		let {
			model,
			system = '',
			prompt,
			stream = false,
			history = [],
			temperature = 0.5,
			max_tokens,
			top_p = 1,
			frequency_penalty = 0.0001,
			presence_penalty = 0,
			stop = '',
			tools,
			toolChoice,
			json_schema_name,  // Añadido json_schema_name
			json_schema
		} = data;

		if (!model || !prompt) {
			throw new Error('Faltan campos requeridos: ' + (!model ? 'model' : 'prompt'));
		}

		try {
			const modelInfo = this.solveModelInfo(model);
			provider = modelInfo.provider;
			const contextWindow = modelInfo.contextWindow;
			console.warn("System:", system);
			console.warn("History:", history);
			console.warn("Prompt:", prompt);
			console.warn("Context Window:", contextWindow);
			let reservedTokens = (Array.isArray(tools) && tools.length > 0) ? tools.length * 150 : 0;
			const adjustedContent = this.adjustContent(system, history, prompt, contextWindow, reservedTokens);
			system = adjustedContent.system;
			history = adjustedContent.history;
			prompt = adjustedContent.prompt;

			const messages = [
				{role: 'system', content: system},
				...history,
				{role: 'user', content: prompt},
			];

			let maxTokensCalculation = contextWindow - this.estimateTokens(messages) - reservedTokens;

			const requestData = {
				model,
				messages,
				temperature,
				max_tokens: max_tokens || maxTokensCalculation,
				top_p,
				frequency_penalty,
				presence_penalty,
				stream,
			};

			if (json_schema) {
				if (!json_schema_name) {
					throw new Error('Falta el campo requerido: json_schema_name');
				}
				requestData.response_format = {
					type: 'json_schema',
					json_schema: {
						name: json_schema_name,  // Incluir el nombre
						schema: json_schema,
						strict: true
					}
				};
			}

			// Verificar si 'tools' es un arreglo no vacío
			if (Array.isArray(tools) && tools.length > 0 && provider === 'openai' && !stream) {
				requestData.tools = tools;
				requestData.tool_choice = toolChoice;
			}

			if (stop) requestData.stop = stop;

			const url = this.solveProviderUrl(provider);
			const headers = {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${modelInfo.authToken}`,
			};

			const axiosConfig = {headers};
			if (stream) axiosConfig.responseType = 'stream';

			return await axios.post(url, requestData, axiosConfig);


		} catch (error) {
			if (error.response && error.response.data) {
				// Imprimir el error de respuesta de manera detallada
				console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
			} else {
				// Imprimir otros errores
				console.error('Error:', error.message);
			}
			throw new Error('Error procesando la solicitud: ' + error.message);
		}
	}


	/**
	 * Retrieves model information including the provider and maximum tokens.
	 *
	 * @param {string} model - The name of the model.
	 * @returns {Object} - An object containing the provider and maximum tokens for the model.
	 * @throws {Error} - Throws an error if the model is not recognized.
	 */
	static solveModelInfo(model) {
		const allModels = [...openAIModels, ...perplexityModels, ...groqModels];
		const modelInfo = allModels.find(m => m.name === model);

		if (!modelInfo) {
			throw new Error(`Model info not found for ${model}`);
		}

		let provider, authToken;

		if (openAIModels.some(m => m.name === model)) {
			provider = 'openai';
			authToken = process.env.OPENAI_API_KEY;
		} else if (perplexityModels.some(m => m.name === model)) {
			provider = 'perplexity';
			authToken = process.env.PERPLEXITY_API_KEY;
		} else if (groqModels.some(m => m.name === model)) {
			provider = 'groq';
			authToken = process.env.GROQ_API_KEY;
		} else {
			throw new Error(`Provider not found for model: ${model}`);
		}

		if (!authToken) {
			throw new Error(`Auth token not found for provider: ${provider}`);
		}

		// Use the contextWindow from the modelInfo, or set a default if not specified
		const contextWindow = modelInfo.contextWindow || 4096;  // Default to 4096 if not specified

		return {
			...modelInfo,
			provider,
			authToken,
			contextWindow
		};
	}

	/**
	 * Solves the provider URL based on the given provider name.
	 *
	 * @param {string} provider - The name of the provider (e.g., 'openai', 'perplexity', 'groq').
	 * @returns {string} - The URL corresponding to the given provider.
	 * @throws {Error} - Throws an error if the provider is not recognized.
	 */
	static solveProviderUrl(provider) {
		let url;

		// Return url based on provider
		if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
		else if (provider === 'perplexity') url = 'https://api.perplexity.ai/chat/completions';
		else if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';
		else throw new Error(`Unknown provider: ${provider}`);

		return url;
	}

	/**
	 * Adjusts content to fit within the context window.
	 *
	 * @param {string} system - The system prompt.
	 * @param {Array} history - The conversation history.
	 * @param {string} prompt - The user prompt.
	 * @param {number} contextWindow - The maximum number of tokens for the context.
	 * @param {number} reservedTokens - Tokens reserved for other purposes.
	 * @returns {Object} - Adjusted system, history, and prompt.
	 */
	static adjustContent(system, history, prompt, contextWindow, reservedTokens = 100) {
		const targetTokens = contextWindow - reservedTokens;
		let currentTokens = this.estimateTokens([
			{role: 'system', content: system},
			...history,
			{role: 'user', content: prompt}
		]);

		console.info(`Starting adjustContent: currentTokens=${currentTokens}, targetTokens=${targetTokens}`);

		let iteration = 0;
		const maxIterations = 100; // Max iterations to avoid infinite loops

		while (currentTokens > targetTokens) {
			iteration++;
			if (iteration > maxIterations) {
				console.error('adjustContent: Max iterations reached, exiting loop to prevent infinite loop.');
				break;
			}

			const tokensOver = currentTokens - targetTokens;
			console.info(`Iteration ${iteration}: currentTokens=${currentTokens}, tokensOver=${tokensOver}, history length=${history.length}, system length=${system.length}, prompt length=${prompt.length}`);

			// Dynamically calculate chunkSize
			let chunkSize = Math.ceil(tokensOver * 0.5); // Take 50% of the excess tokens as chunkSize

			// Convert chunkSize to approximate number of characters (assuming ~4 chars per token)
			const approxCharsPerToken = 4;
			const charsToRemove = chunkSize * approxCharsPerToken;

			if (history.length > 1) {
				// Remove the oldest message from history
				const removedMessage = history.shift();
				console.info(`Removed oldest message from history: ${JSON.stringify(removedMessage)}`);
			} else if (system.length > 50) {
				// Trim the system message
				const trimLength = Math.min(charsToRemove, system.length - 50);
				console.info(`Trimming system message by ${trimLength} characters.`);
				system = system.slice(0, -trimLength);
			} else if (prompt.length > 50) {
				// Trim the prompt as a last resort
				const trimLength = Math.min(charsToRemove, prompt.length - 50);
				console.info(`Trimming prompt by ${trimLength} characters.`);
				prompt = prompt.slice(0, -trimLength);
			} else {
				console.info('Cannot reduce content further, breaking the loop.');
				break; // Can't reduce further
			}

			// Recalculate current tokens after adjustments
			currentTokens = this.estimateTokens([
				{role: 'system', content: system},
				...history,
				{role: 'user', content: prompt}
			]);

			console.info(`After adjustment: currentTokens=${currentTokens}`);
		}

		console.info(`Finished adjustContent: currentTokens=${currentTokens}, targetTokens=${targetTokens}`);

		return {system, history, prompt};
	}

	/**
	 * Estimates the number of tokens in the messages.
	 *
	 * @param {Array} messages - An array of message objects.
	 * @returns {number} - The estimated number of tokens.
	 */
	static estimateTokens(messages) {
		return promptTokensEstimate({messages});
	}

}

export default AIService;
