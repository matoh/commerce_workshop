import { FastifyInstance } from 'fastify';
import * as productService from '../services/product.service.js';
import { bulkPriceUpdateSchema, BulkPriceUpdateInput } from '../schemas/index.js';

export async function productRoutes(app: FastifyInstance) {
  app.get('/api/products', async () => {
    return productService.listProducts();
  });

  app.get<{ Params: { id: string } }>('/api/products/:id', async (request) => {
    const id = parseInt(request.params.id, 10);
    return productService.getProductById(id);
  });

  app.post<{ Body: BulkPriceUpdateInput }>(
    '/api/products/bulk-price',
    { schema: { body: bulkPriceUpdateSchema } },
    async (request) => {
      const { productIds, adjustment } = request.body;
      return productService.bulkUpdatePrice(productIds, adjustment);
    },
  );

  app.get<{ Params: { jobId: string } }>('/api/products/bulk-price/:jobId', async (request) => {
    const jobId = parseInt(request.params.jobId, 10);
    return productService.getBulkPriceJob(jobId);
  });
}
