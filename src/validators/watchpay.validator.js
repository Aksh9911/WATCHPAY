'use strict';

const Joi = require('joi');

const payoutCreateSchema = Joi.object({
  withdrawId: Joi.string().required().messages({
    'string.base': 'withdrawId must be a string',
    'any.required': 'withdrawId is required',
  }),
  accountNumber: Joi.string().required().messages({
    'any.required': 'accountNumber is required',
  }),
  accountHolder: Joi.string().required().messages({
    'any.required': 'accountHolder is required',
  }),
  ifscCode: Joi.string().required().messages({
    'any.required': 'ifscCode is required',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'amount must be a number',
    'number.positive': 'amount must be positive',
    'any.required': 'amount is required',
  }),
});

const payoutCallbackSchema = Joi.object({
  merNo: Joi.string().required(),
  merTransferId: Joi.string().required(),
  transferAmount: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  tradeResult: Joi.string().required(),
  tradeNo: Joi.string().optional(),
  sign: Joi.string().required(),
  signType: Joi.string().optional(),
  applyDate: Joi.string().optional(),
  version: Joi.string().optional(),
  respCode: Joi.string().optional(),
}).unknown(true);

function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    const err = new Error('Validation failed');
    err.code = 'VALIDATION_ERROR';
    err.details = details;
    throw err;
  }
  return value;
}

module.exports = {
  validatePayoutCreate: (data) => validate(payoutCreateSchema, data),
  validatePayoutCallback: (data) => validate(payoutCallbackSchema, data),
};
