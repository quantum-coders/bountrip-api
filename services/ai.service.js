import axios from 'axios';
import {promptTokensEstimate} from 'openai-chat-tokens';
import {groqModels, openAIModels, perplexityModels} from '../assets/data/ai-models.js';
import 'dotenv/config';

class AIService {

	/**
	 * Sends a message to the AI model and streams the response back to the client.
	 *
	 * @param {Object} data - The data to send to the AI model.
	 * @param {string} provider - The provider of the AI model.
	 * @returns {Promise<Object>} - A promise that resolves to the response from the AI model.
	 * @throws {Error} - Throws an error if there is an issue with the request or the response.
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
			tools = [],
			toolChoice,
		} = data;

		if (!model || !prompt) {
			throw new Error('Missing required fields: ' + (!model ? 'model' : 'prompt'));
		}

		try {
			const modelInfo = this.solveModelInfo(model);
			provider = modelInfo.provider;
			const contextWindow = modelInfo.contextWindow;
			console.warn("System:", system);
			console.warn("History:", history);
			console.warn("Prompt:", prompt);
			console.warn("Context Window:", contextWindow);
			let reservedTokens = tools.length * 150
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

			if (tools && provider === 'openai' && !stream) {
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
				// Imprime el error de respuesta de manera detallada
				console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
			} else {
				// Imprime otros errores
				console.error('Error:', error.message);
			}
			throw new Error('Error processing the request: ' + error.message);
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

		// return url based on provider
		if (provider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
		if (provider === 'perplexity') url = 'https://api.perplexity.ai/chat/completions';
		if (provider === 'groq') url = 'https://api.groq.com/openai/v1/chat/completions';

		return url;
	}

	static adjustContent(system, history, prompt, contextWindow, reservedTokens = 100) {
		const targetTokens = contextWindow - reservedTokens;
		let currentTokens = this.estimateTokens([
			{role: 'system', content: system},
			...history,
			{role: 'user', content: prompt}
		]);

		console.info(`Starting adjustContent: currentTokens=${currentTokens}, targetTokens=${targetTokens}`);

		let iteration = 0;
		const maxIterations = 100; // Establecemos un máximo de iteraciones para evitar bucles infinitos

		while (currentTokens > targetTokens) {
			iteration++;
			if (iteration > maxIterations) {
				console.error('adjustContent: Max iterations reached, exiting loop to prevent infinite loop.');
				break;
			}

			const tokensOver = currentTokens - targetTokens;
			console.info(`Iteration ${iteration}: currentTokens=${currentTokens}, tokensOver=${tokensOver}, history length=${history.length}, system length=${system.length}, prompt length=${prompt.length}`);

			// Calculamos el chunkSize dinámicamente
			let chunkSize = Math.ceil(tokensOver * 0.5); // Tomamos el 50% de los tokens sobrantes como chunkSize

			// Convertimos chunkSize a número de caracteres aproximado (asumiendo que un token es aproximadamente 4 caracteres)
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

			// Recalculamos los tokens actuales después de los ajustes
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

	static estimateTokens(messages) {
		return promptTokensEstimate({messages});
	}

}

export default AIService;
