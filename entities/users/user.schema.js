import Joi from 'joi';

export default Joi.object({
	id: Joi.number().integer().optional(),
	idNear: Joi.string().required(),
	uid: Joi.string().guid().optional(),
	username: Joi.string().optional().default(''),
	email: Joi.string().email().optional().default(''),
	firstname: Joi.string().optional().default(''),
	lastname: Joi.string().optional().default(''),
	nicename: Joi.string().optional().default(''),
	password: Joi.string().optional().allow('').default(''),
	type: Joi.string().default('User'),
	status: Joi.string().default('Active'),
	language: Joi.string().default('en'),
	metas: Joi.alternatives().try(Joi.object()).default({}),
});