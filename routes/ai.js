/**
 * @fileoverview Route definitions for AI-related operations.
 * @module ai.routes
 */

import AIController from '../controllers/ai.controller.js';
import {Primate} from '@thewebchimp/primate';

const router = Primate.getRouter();

// Ruta para generar etiquetas de interés de viaje
router.post('/tags', AIController.generateTags);

// Ruta para generar descripción de un destino
router.post('/description', AIController.generateDescription);

// Ruta para generar itinerario de viaje
router.post('/itinerary', AIController.generateItinerary);

// Ruta para estimar presupuesto de viaje
router.post('/budget', AIController.estimateBudget);

// Ruta para recomendar actividades turísticas
router.post('/activities', AIController.recommendActivities);

// Ruta para sugerir alojamiento
router.post('/accommodation', AIController.suggestAccommodation);

// Ruta para analizar opiniones de usuarios
router.post('/reviews', AIController.analyzeReviews);

// Ruta para obtener detalles de lugares
router.post('/place-details', AIController.getPlaceDetails);

// Ruta para obtener lugares cercanos
router.post('/nearby-places', AIController.getNearbyPlaces);

// Ruta para obtener detalles de rutas y transporte
router.post('/route-details', AIController.getRouteDetails);

// Ruta para obtener eventos locales
router.post('/local-events', AIController.getLocalEvents);

// Ruta para obtener el pronóstico del clima
router.post('/weather-forecast', AIController.getWeatherForecast);

// Ruta para obtener información de accesibilidad
router.post('/accessibility-info', AIController.getAccessibilityInfo);


export {router};
