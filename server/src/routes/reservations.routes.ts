import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import * as reservationService from '../services/reservation.service.js';
import { reserveInputSchema, ReserveInput } from '../schemas/index.js';

const reserveHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: ReserveInput }>,
) => {
  const productId = parseInt(request.params.id, 10);
  const { channelId, quantity } = request.body;
  return reservationService.reserve(productId, channelId, quantity ?? 1);
};

const completeHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
) => {
  const reservationId = parseInt(request.params.id, 10);
  return reservationService.complete(reservationId);
};

const reservationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/products/:id/reserve', { schema: { body: reserveInputSchema } }, reserveHandler);
  fastify.post('/reservations/:id/complete', completeHandler);
};

export default reservationRoutes;
