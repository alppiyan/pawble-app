import Joi from 'joi';

export const toggleShelter = {
  params: Joi.object({ userId: Joi.number().integer().positive().required() }),
  body: Joi.object({ isShelter: Joi.boolean().required() }),
};
