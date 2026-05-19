import Joi from 'joi';

export const otherIdParam = {
  params: Joi.object({ otherId: Joi.number().integer().positive().required() }),
};
