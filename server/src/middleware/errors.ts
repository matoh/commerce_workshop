import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError || error.name === 'AppError') {
    const statusCode = (error as AppError).statusCode || 500;
    return reply.status(statusCode).send({
      error: error.message,
    });
  }

  // Fastify validation errors (Ajv)
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: error.validation,
    });
  }

  // Unknown errors
  reply.log.error(error);
  return reply.status(500).send({
    error: 'Internal server error',
  });
}
