import Joi from 'joi';

export const register = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    surname: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().max(120).required(),
    password: Joi.string().min(6).max(100).required(),
    location: Joi.string().max(120).allow('').default(''),
  }),
};

export const login = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const updateProfile = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    surname: Joi.string().min(1).max(50).required(),
    location: Joi.string().max(120).allow('').default(''),
  }),
};
