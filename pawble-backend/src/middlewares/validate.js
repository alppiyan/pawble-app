import { AppError } from '../utils/AppError.js';

const PARTS = ['body', 'params', 'query'];

export const validate = (schemaMap) => (req, _res, next) => {
  const errors = [];

  for (const part of PARTS) {
    const schema = schemaMap[part];
    if (!schema) continue;
    const { value, error } = schema.validate(req[part], { abortEarly: false, stripUnknown: true });
    if (error) {
      for (const d of error.details) {
        errors.push({ path: `${part}.${d.path.join('.')}`, message: d.message });
      }
    } else if (part === 'query') {
      // Express 5: req.query is a read-only getter. Mutate the cached object in place.
      for (const k of Object.keys(req.query)) delete req.query[k];
      Object.assign(req.query, value);
    } else {
      req[part] = value;
    }
  }

  if (errors.length) {
    return next(new AppError('Invalid request', 422, 'VALIDATION_ERROR', errors));
  }
  next();
};
