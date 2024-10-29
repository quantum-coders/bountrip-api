/**
 * @fileoverview Route definitions for AI-related operations.
 * @module ai.routes
 */

import AIController from '../controllers/ai.controller.js';
import {Primate} from '@thewebchimp/primate';

const router = Primate.getRouter();

// Ruta para generar etiquetas de interés de viaje
router.post('/tags', AIController.generateTags);

// Puedes agregar más rutas relacionadas con operaciones AI en el futuro

export {router};
