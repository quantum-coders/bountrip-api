/**
 * @fileoverview Controller for handling AI-related operations.
 * Handles generating travel interest tags based on user input.
 * @module AIController
 */

import AIService from '../services/ai.service.js';

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
			const { input } = req.body;

			// Input validation
			if(!input || typeof input !== 'string' || input.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid input. A non-empty string field "input" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for the response
			const json_schema = {
				'type': 'object',
				'properties': {
					'tags': {
						'type': 'array',
						'items': {
							'type': 'string',
						},
					},
				},
				'required': [ 'tags' ],
				'additionalProperties': false,
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Extract travel interest tags based on the user input.',
				prompt: input,
				json_schema_name: 'travel_tags',
				json_schema: json_schema,
			};

			// Call AIService to generate tags
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);

			console.info('AI response:', result.data.choices[0].message.content);
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Tags generated successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in generateTags:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error generating tags.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Generates a travel itinerary based on user input, compatible with Google Places API.
	 * @param {Object} req - Express request object.
	 * @param {Object} res - Express response object.
	 * @returns {Promise<void>}
	 */
	static async generateItinerary(req, res) {
		try {
			const { input, duration, preferences } = req.body;

			// Input validation
			if(!input || typeof input !== 'string' || input.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid input. A non-empty string field "input" is required.',
					statusCode: 400,
				});
			}

			if(!duration || typeof duration !== 'number' || duration <= 0) {
				return res.respond({
					data: null,
					message: 'Invalid duration. A positive number field "duration" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for the response, compatible with Google Places API
			const json_schema = {
				'type': 'object',
				'properties': {
					'itinerary': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'day': { 'type': 'integer' },
								'activities': {
									'type': 'array',
									'items': {
										'type': 'object',
										'properties': {
											'place_id': { 'type': 'string' },
											'name': { 'type': 'string' },
											'types': {
												'type': 'array',
												'items': { 'type': 'string' },
											},
											'formatted_address': { 'type': 'string' },
											'geometry': {
												'type': 'object',
												'properties': {
													'location': {
														'type': 'object',
														'properties': {
															'lat': { 'type': 'number' },
															'lng': { 'type': 'number' },
														},
														'required': [ 'lat', 'lng' ],
														'additionalProperties': false,
													},
												},
												'required': [ 'location' ],
												'additionalProperties': false,
											},
										},
										'required': [ 'place_id', 'name', 'types', 'formatted_address', 'geometry' ],
										'additionalProperties': false,
									},
								},
							},
							'required': [ 'day', 'activities' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'itinerary' ],
				'additionalProperties': false,
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Generate a detailed travel itinerary based on the user input. Use place details compatible with Google Places API.',
				prompt: `Plan a trip to ${ input } for ${ duration } days. Preferences: ${ preferences || 'None' }. Provide place_id and details matching Google Places API.`,
				json_schema_name: 'travel_itinerary',
				json_schema: json_schema,
			};

			// Call AIService to generate the itinerary
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);
			console.info('AI response:', result.data.choices[0].message.content);
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Itinerary generated successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in generateItinerary:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error generating itinerary.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Recommends tourist activities based on user input, compatible with Google Places API.
	 * @param {Object} req - Express request object.
	 * @param {Object} res - Express response object.
	 * @returns {Promise<void>}
	 */
	static async recommendActivities(req, res) {
		try {
			const { destination, interests } = req.body;

			// Input validation
			if(!destination || typeof destination !== 'string' || destination.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid destination. A non-empty string field "destination" is required.',
					statusCode: 400,
				});
			}

			if(!interests || !Array.isArray(interests) || interests.length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid interests. A non-empty array field "interests" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for the response, compatible with Google Places API
			const json_schema = {
				'type': 'object',
				'properties': {
					'activities': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'place_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'types': {
									'type': 'array',
									'items': { 'type': 'string' },
								},
								'formatted_address': { 'type': 'string' },
								'rating': { 'type': 'number' },
								'user_ratings_total': { 'type': 'integer' },
								'geometry': {
									'type': 'object',
									'properties': {
										'location': {
											'type': 'object',
											'properties': {
												'lat': { 'type': 'number' },
												'lng': { 'type': 'number' },
											},
											'required': [ 'lat', 'lng' ],
											'additionalProperties': false,
										},
									},
									'required': [ 'location' ],
									'additionalProperties': false,
								},
							},
							'required': [ 'place_id', 'name', 'types', 'formatted_address', 'geometry' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'activities' ],
				'additionalProperties': false,
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Recommend tourist activities based on user input. Provide place details compatible with Google Places API.',
				prompt: `Recommend activities in ${ destination } that align with the following interests: ${ interests.join(', ') }. Provide place_id and details matching Google Places API.`,
				json_schema_name: 'recommended_activities',
				json_schema: json_schema,
			};

			// Call AIService to recommend activities
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);
			console.info('AI response:', result.data.choices[0].message.content);
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Activities recommended successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in recommendActivities:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error recommending activities.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Suggests accommodation options based on user input, compatible with Google Places API.
	 * @param {Object} req - Express request object.
	 * @param {Object} res - Express response object.
	 * @returns {Promise<void>}
	 */
	static async suggestAccommodation(req, res) {
		try {
			const { destination, checkIn, checkOut, preferences } = req.body;

			// Input validation
			if(!destination || typeof destination !== 'string' || destination.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid destination. A non-empty string field "destination" is required.',
					statusCode: 400,
				});
			}

			if(!checkIn || !checkOut) {
				return res.respond({
					data: null,
					message: 'Check-in and check-out dates are required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for the response, compatible with Google Places API
			const json_schema = {
				'type': 'object',
				'properties': {
					'accommodations': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'place_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'formatted_address': { 'type': 'string' },
								'rating': { 'type': 'number' },
								'user_ratings_total': { 'type': 'integer' },
								'price_level': { 'type': 'integer' },
								'types': {
									'type': 'array',
									'items': { 'type': 'string' },
								},
								'geometry': {
									'type': 'object',
									'properties': {
										'location': {
											'type': 'object',
											'properties': {
												'lat': { 'type': 'number' },
												'lng': { 'type': 'number' },
											},
											'required': [ 'lat', 'lng' ],
											'additionalProperties': false,
										},
									},
									'required': [ 'location' ],
									'additionalProperties': false,
								},
							},
							'required': [ 'place_id', 'name', 'formatted_address', 'geometry' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'accommodations' ],
				'additionalProperties': false,
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Suggest accommodation options based on user input. Provide place details compatible with Google Places API.',
				prompt: `Suggest accommodations in ${ destination } for the dates ${ checkIn } to ${ checkOut }. Preferences: ${ preferences || 'None' }. Provide place_id and details matching Google Places API.`,
				json_schema_name: 'suggested_accommodations',
				json_schema: json_schema,
			};

			// Call AIService to suggest accommodation
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);
			console.info('AI response:', result.data.choices[0].message.content);
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Accommodations suggested successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in suggestAccommodation:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error suggesting accommodation.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Analyzes user reviews and extracts relevant insights.
	 * @param {Object} req - Express request object.
	 * @param {Object} res - Express response object.
	 * @returns {Promise<void>}
	 */
	static async analyzeReviews(req, res) {
		try {
			const { reviews } = req.body;

			// Input validation
			if(!reviews || !Array.isArray(reviews) || reviews.length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid reviews. A non-empty array field "reviews" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for the response
			const json_schema = {
				'type': 'object',
				'properties': {
					'sentimentAnalysis': {
						'type': 'object',
						'properties': {
							'positive': { 'type': 'number' },
							'neutral': { 'type': 'number' },
							'negative': { 'type': 'number' },
						},
						'required': [ 'positive', 'neutral', 'negative' ],
						'additionalProperties': false,
					},
					'commonThemes': {
						'type': 'array',
						'items': { 'type': 'string' },
					},
					'averageRating': { 'type': 'number' },
				},
				'required': [ 'sentimentAnalysis', 'commonThemes', 'averageRating' ],
				'additionalProperties': false,
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Analyze user reviews and extract relevant insights.',
				prompt: `Analyze the following user reviews and provide sentiment analysis, common themes, and average rating:\n\n${ reviews.join('\n') }`,
				json_schema_name: 'reviews_analysis',
				json_schema: json_schema,
			};

			// Call AIService to analyze reviews
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);
			console.info('AI response:', result.data.choices[0].message.content);
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Reviews analyzed successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in analyzeReviews:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error analyzing reviews.',
				statusCode: 500,
			});
		}
	}

	/**
	 * Estimates the travel budget based on user input.
	 * @param {Object} req - Express request object.
	 * @param {Object} res - Express response object.
	 * @returns {Promise<void>}
	 */
	static async estimateBudget(req, res) {
		try {
			const { destination, duration, travelStyle } = req.body;

			// Input validation
			if(!destination || typeof destination !== 'string' || destination.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid destination. A non-empty string field "destination" is required.',
					statusCode: 400,
				});
			}

			if(!duration || typeof duration !== 'number' || duration <= 0) {
				return res.respond({
					data: null,
					message: 'Invalid duration. A positive number field "duration" is required.',
					statusCode: 400,
				});
			}

			if(!travelStyle || typeof travelStyle !== 'string' || travelStyle.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid travelStyle. A non-empty string field "travelStyle" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for the response
			const json_schema = {
				'type': 'object',
				'properties': {
					'estimatedBudget': {
						'type': 'object',
						'properties': {
							'accommodation': { 'type': 'number' },
							'food': { 'type': 'number' },
							'transportation': { 'type': 'number' },
							'activities': { 'type': 'number' },
							'miscellaneous': { 'type': 'number' },
						},
						'required': [ 'accommodation', 'food', 'transportation', 'activities', 'miscellaneous' ],
						'additionalProperties': false,
					},
					'total': { 'type': 'number' },
				},
				'required': [ 'estimatedBudget', 'total' ],
				'additionalProperties': false,
			};

			// Prepare data for AIService
			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Calculate a detailed budget for a trip based on user input.',
				prompt: `Calculate the budget for a trip to ${ destination } for ${ duration } days with a"${ travelStyle }" travel style`,
				json_schema_name: 'travel_budget',
				json_schema: json_schema,
			};

			// Call AIService to estimate the budget
			const result = await AIService.sendMessage(data, 'openai');

			console.info('AI response:', result.data);
			console.info('AI response:', result.data.choices[0].message.content);
			const parsed = JSON.parse(result.data.choices[0].message.content);
			console.info('AI response parsed:', parsed);
			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Budget estimated successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in estimateBudget:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error estimating budget.',
				statusCode: 500,
			});
		}
	}

	static async getPlaceDetails(req, res) {
		try {
			const { query } = req.body;

			if(!query || typeof query !== 'string' || query.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid query. A non-empty string field "query" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema compatible with Google Places
			const json_schema = {
				'type': 'object',
				'properties': {
					'places': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'place_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'formatted_address': { 'type': 'string' },
								'geometry': {
									'type': 'object',
									'properties': {
										'location': {
											'type': 'object',
											'properties': {
												'lat': { 'type': 'number' },
												'lng': { 'type': 'number' },
											},
											'required': [ 'lat', 'lng' ],
											'additionalProperties': false,
										},
									},
									'required': [ 'location' ],
									'additionalProperties': false,
								},
								'types': {
									'type': 'array',
									'items': { 'type': 'string' },
								},
							},
							'required': [ 'place_id', 'name', 'formatted_address', 'geometry', 'types' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'places' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide detailed place information compatible with Google Places API based on user query.',
				prompt: `Provide place details for the following query: ${ query }`,
				json_schema_name: 'place_details',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Place details retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getPlaceDetails:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving place details.',
				statusCode: 500,
			});
		}
	}

	static async getNearbyPlaces(req, res) {
		try {
			const { location, radius, type } = req.body;

			if(!location || typeof location !== 'string' || location.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid location. A non-empty string field "location" is required.',
					statusCode: 400,
				});
			}

			if(!radius || typeof radius !== 'number' || radius <= 0) {
				return res.respond({
					data: null,
					message: 'Invalid radius. A positive number field "radius" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema compatible with Google Places
			const json_schema = {
				'type': 'object',
				'properties': {
					'places': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'place_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'vicinity': { 'type': 'string' },
								'geometry': {
									'type': 'object',
									'properties': {
										'location': {
											'type': 'object',
											'properties': {
												'lat': { 'type': 'number' },
												'lng': { 'type': 'number' },
											},
											'required': [ 'lat', 'lng' ],
											'additionalProperties': false,
										},
									},
									'required': [ 'location' ],
									'additionalProperties': false,
								},
								'types': {
									'type': 'array',
									'items': { 'type': 'string' },
								},
							},
							'required': [ 'place_id', 'name', 'vicinity', 'geometry', 'types' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'places' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide a list of nearby places compatible with Google Places API based on user input.',
				prompt: `List nearby ${ type || 'points of interest' } around ${ location } within a radius of ${ radius } meters.`,
				json_schema_name: 'nearby_places',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Nearby places retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getNearbyPlaces:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving nearby places.',
				statusCode: 500,
			});
		}
	}

	static async getRouteDetails(req, res) {
		try {
			const { origin, destination, mode } = req.body;

			if(!origin || typeof origin !== 'string' || origin.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid origin. A non-empty string field "origin" is required.',
					statusCode: 400,
				});
			}

			if(!destination || typeof destination !== 'string' || destination.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid destination. A non-empty string field "destination" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema compatible with Google Directions
			const json_schema = {
				'type': 'object',
				'properties': {
					'routes': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'summary': { 'type': 'string' },
								'legs': {
									'type': 'array',
									'items': {
										'type': 'object',
										'properties': {
											'distance': {
												'type': 'object',
												'properties': {
													'text': { 'type': 'string' },
													'value': { 'type': 'number' },
												},
												'required': [ 'text', 'value' ],
												'additionalProperties': false,
											},
											'duration': {
												'type': 'object',
												'properties': {
													'text': { 'type': 'string' },
													'value': { 'type': 'number' },
												},
												'required': [ 'text', 'value' ],
												'additionalProperties': false,
											},
											'start_address': { 'type': 'string' },
											'end_address': { 'type': 'string' },
											'steps': {
												'type': 'array',
												'items': {
													'type': 'object',
													'properties': {
														'travel_mode': { 'type': 'string' },
														'start_location': {
															'type': 'object',
															'properties': {
																'lat': { 'type': 'number' },
																'lng': { 'type': 'number' },
															},
															'required': [ 'lat', 'lng' ],
															'additionalProperties': false,
														},
														'end_location': {
															'type': 'object',
															'properties': {
																'lat': { 'type': 'number' },
																'lng': { 'type': 'number' },
															},
															'required': [ 'lat', 'lng' ],
															'additionalProperties': false,
														},
														'polyline': {
															'type': 'object',
															'properties': {
																'points': { 'type': 'string' },
															},
															'required': [ 'points' ],
															'additionalProperties': false,
														},
														'duration': {
															'type': 'object',
															'properties': {
																'text': { 'type': 'string' },
																'value': { 'type': 'number' },
															},
															'required': [ 'text', 'value' ],
															'additionalProperties': false,
														},
														'html_instructions': { 'type': 'string' },
													},
													'required': [ 'travel_mode', 'start_location', 'end_location', 'polyline', 'duration', 'html_instructions' ],
													'additionalProperties': false,
												},
											},
										},
										'required': [ 'distance', 'duration', 'start_address', 'end_address', 'steps' ],
										'additionalProperties': false,
									},
								},
							},
							'required': [ 'summary', 'legs' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'routes' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide route details compatible with Google Directions API based on user input.',
				prompt: `Provide route details from ${ origin } to ${ destination } by ${ mode || 'driving' }.`,
				json_schema_name: 'route_details',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Route details retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getRouteDetails:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving route details.',
				statusCode: 500,
			});
		}
	}

	static async getLocalEvents(req, res) {
		try {
			const { destination, startDate, endDate } = req.body;

			if(!destination || typeof destination !== 'string' || destination.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid destination. A non-empty string field "destination" is required.',
					statusCode: 400,
				});
			}

			if(!startDate || !endDate) {
				return res.respond({
					data: null,
					message: 'Start date and end date are required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema compatible with event data
			const json_schema = {
				'type': 'object',
				'properties': {
					'events': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'event_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'description': { 'type': 'string' },
								'start_time': { 'type': 'string', 'format': 'date-time' },
								'end_time': { 'type': 'string', 'format': 'date-time' },
								'location': {
									'type': 'object',
									'properties': {
										'name': { 'type': 'string' },
										'address': { 'type': 'string' },
										'lat': { 'type': 'number' },
										'lng': { 'type': 'number' },
									},
									'required': [ 'name', 'address', 'lat', 'lng' ],
									'additionalProperties': false,
								},
								'types': {
									'type': 'array',
									'items': { 'type': 'string' },
								},
							},
							'required': [ 'event_id', 'name', 'description', 'start_time', 'end_time', 'location', 'types' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'events' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide local event information compatible with event data structure based on user input.',
				prompt: `List events happening in ${ destination } from ${ startDate } to ${ endDate }.`,
				json_schema_name: 'local_events',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Local events retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getLocalEvents:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving local events.',
				statusCode: 500,
			});
		}
	}

	static async getWeatherForecast(req, res) {
		try {
			const { destination, dates } = req.body;

			if(!destination || typeof destination !== 'string' || destination.trim().length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid destination. A non-empty string field "destination" is required.',
					statusCode: 400,
				});
			}

			if(!dates || !Array.isArray(dates) || dates.length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid dates. A non-empty array field "dates" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema compatible with weather data
			const json_schema = {
				'type': 'object',
				'properties': {
					'weather_forecast': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'date': { 'type': 'string', 'format': 'date' },
								'temperature': {
									'type': 'object',
									'properties': {
										'min': { 'type': 'number' },
										'max': { 'type': 'number' },
									},
									'required': [ 'min', 'max' ],
									'additionalProperties': false,
								},
								'weather': { 'type': 'string' },
								'humidity': { 'type': 'number' },
								'wind_speed': { 'type': 'number' },
							},
							'required': [ 'date', 'temperature', 'weather', 'humidity', 'wind_speed' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'weather_forecast' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide weather forecast information compatible with weather data structure based on user input.',
				prompt: `Provide weather forecast for ${ destination } on the following dates: ${ dates.join(', ') }.`,
				json_schema_name: 'weather_forecast',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Weather forecast retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getWeatherForecast:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving weather forecast.',
				statusCode: 500,
			});
		}
	}

	static async getAccessibilityInfo(req, res) {
		try {
			const { places } = req.body;

			if(!places || !Array.isArray(places) || places.length === 0) {
				return res.respond({
					data: null,
					message: 'Invalid places. A non-empty array field "places" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for accessibility information
			const json_schema = {
				'type': 'object',
				'properties': {
					'accessibility_info': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'place_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'wheelchair_accessible': { 'type': 'boolean' },
								'braille_signs': { 'type': 'boolean' },
								'hearing_assistance': { 'type': 'boolean' },
								'description': { 'type': 'string' },
							},
							'required': [ 'place_id', 'name', 'wheelchair_accessible', 'braille_signs', 'hearing_assistance', 'description' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'accessibility_info' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide accessibility information for the given places.',
				prompt: `Provide accessibility details for the following places: ${ places.join(', ') }.`,
				json_schema_name: 'accessibility_info',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Accessibility information retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getAccessibilityInfo:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving accessibility information.',
				statusCode: 500,
			});
		}
	}

	static async generateDescription(req, res) {
		try {
			const { place } = req.body;

			if(!place) {
				return res.respond({
					data: null,
					message: 'Invalid place. A non-empty string field "place" is required.',
					statusCode: 400,
				});
			}

			// Define the JSON schema for accessibility information
			const json_schema = {
				'type': 'object',
				'properties': {
					'accessibility_info': {
						'type': 'array',
						'items': {
							'type': 'object',
							'properties': {
								'place_id': { 'type': 'string' },
								'name': { 'type': 'string' },
								'wheelchair_accessible': { 'type': 'boolean' },
								'braille_signs': { 'type': 'boolean' },
								'hearing_assistance': { 'type': 'boolean' },
								'description': { 'type': 'string' },
							},
							'required': [ 'place_id', 'name', 'wheelchair_accessible', 'braille_signs', 'hearing_assistance', 'description' ],
							'additionalProperties': false,
						},
					},
				},
				'required': [ 'accessibility_info' ],
				'additionalProperties': false,
			};

			const data = {
				model: 'gpt-4o-2024-08-06',
				system: 'Provide accessibility information for the given places.',
				prompt: `Provide accessibility details for the following places: ${ places.join(', ') }.`,
				json_schema_name: 'accessibility_info',
				json_schema: json_schema,
			};

			const result = await AIService.sendMessage(data, 'openai');

			const parsed = JSON.parse(result.data.choices[0].message.content);

			if(parsed) {
				return res.respond({
					data: parsed,
					message: 'Accessibility information retrieved successfully.',
					statusCode: 200,
				});
			} else {
				return res.respond({
					data: null,
					message: result.refusal,
					statusCode: 403,
				});
			}

		} catch(error) {
			console.error('Error in getAccessibilityInfo:', error);
			return res.respond({
				data: null,
				message: error.message || 'Error retrieving accessibility information.',
				statusCode: 500,
			});
		}
	}
}

export default AIController;
