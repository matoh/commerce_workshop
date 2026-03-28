import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import * as productService from '../services/product.service.js';
import { bulkPriceUpdateSchema, BulkPriceUpdateInput } from '../schemas/index.js';

const listProductsHandler = async () => {
  return productService.listProducts();
};

const getProductHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
) => {
  const id = parseInt(request.params.id, 10);
  return productService.getProductById(id);
};

const bulkPriceUpdateHandler = async (
  request: FastifyRequest<{ Body: BulkPriceUpdateInput }>,
) => {
  const { productIds, adjustment } = request.body;
  return productService.bulkUpdatePrice(productIds, adjustment);
};

const getBulkPriceJobHandler = async (
  request: FastifyRequest<{ Params: { jobId: string } }>,
) => {
  const jobId = parseInt(request.params.jobId, 10);
  return productService.getBulkPriceJob(jobId);
};

const productsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', listProductsHandler);
  fastify.get('/:id', getProductHandler);
  fastify.post('/bulk-price', { schema: { body: bulkPriceUpdateSchema } }, bulkPriceUpdateHandler);
  fastify.get('/bulk-price/:jobId', getBulkPriceJobHandler);
};

export default productsRoutes;
