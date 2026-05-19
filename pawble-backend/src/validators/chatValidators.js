import Joi from 'joi';

export const sendMessage = {
  body: Joi.object({
    receiverId: Joi.number().integer().positive().required(),
    content: Joi.string().min(1).max(2000).required(),
  }),
};

export const otherIdParam = {
  params: Joi.object({ otherId: Joi.number().integer().positive().required() }),
};
