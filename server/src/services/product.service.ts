import { sql } from 'kysely';
import { db } from '../db/index.js';
import { AppError } from '../utils/errors.js';

export async function listProducts() {
  return await sql<Record<string, unknown>>`
    SELECT
      p.*,
      json_agg(
        json_build_object(
          'channelId', ci.channel_id,
          'channelName', c.name,
          'channelType', c.type,
          'allocatedStock', ci.allocated_stock,
          'reservedStock', ci.reserved_stock,
          'availableStock', ci.allocated_stock - ci.reserved_stock
        ) ORDER BY ci.channel_id
      ) AS channels
    FROM products p
    LEFT JOIN channel_inventory ci ON ci.product_id = p.id
    LEFT JOIN channels c ON c.id = ci.channel_id
    GROUP BY p.id
    ORDER BY p.id
  `.execute(db).then((r) => r.rows);
}

export async function getProductById(id: number) {
  const rows = await sql<Record<string, unknown>>`
    SELECT
      p.*,
      json_agg(
        json_build_object(
          'channelId', ci.channel_id,
          'channelName', c.name,
          'channelType', c.type,
          'allocatedStock', ci.allocated_stock,
          'reservedStock', ci.reserved_stock,
          'availableStock', ci.allocated_stock - ci.reserved_stock
        ) ORDER BY ci.channel_id
      ) AS channels
    FROM products p
    LEFT JOIN channel_inventory ci ON ci.product_id = p.id
    LEFT JOIN channels c ON c.id = ci.channel_id
    WHERE p.id = ${id}
    GROUP BY p.id
  `.execute(db).then((r) => r.rows);

  if (rows.length === 0) {
    throw new AppError(404, 'Product not found');
  }

  return rows[0];
}

export async function bulkUpdatePrice(
  productIds: number[],
  adjustment: { type: 'percentage' | 'fixed'; value: number },
) {
  return await db.transaction().execute(async (trx) => {
    // Create job
    const job = await trx
      .insertInto('price_update_jobs')
      .values({ status: 'running', total_items: productIds.length })
      .returning('id')
      .executeTakeFirstOrThrow();

    let completedItems = 0;
    let failedItems = 0;

    for (const productId of productIds) {
      try {
        const product = await trx
          .selectFrom('products')
          .select('price')
          .where('id', '=', productId)
          .executeTakeFirst();

        if (!product) {
          failedItems++;
          await trx
            .insertInto('price_update_items')
            .values({ job_id: job.id, product_id: productId, old_price: 0, new_price: 0, status: 'failed' })
            .execute();
          continue;
        }

        const oldPrice = parseFloat(product.price);
        const newPrice =
          adjustment.type === 'percentage'
            ? Math.round(oldPrice * (1 + adjustment.value / 100) * 100) / 100
            : Math.round((oldPrice + adjustment.value) * 100) / 100;

        await trx
          .updateTable('products')
          .set({ price: newPrice, updated_at: new Date() })
          .where('id', '=', productId)
          .execute();

        await trx
          .insertInto('price_update_items')
          .values({ job_id: job.id, product_id: productId, old_price: oldPrice, new_price: newPrice, status: 'applied' })
          .execute();

        completedItems++;
      } catch {
        failedItems++;
      }
    }

    await trx
      .updateTable('price_update_jobs')
      .set({ status: 'completed', completed_items: completedItems, failed_items: failedItems })
      .where('id', '=', job.id)
      .execute();

    return { jobId: job.id, completedItems, failedItems };
  });
}

export async function getBulkPriceJob(jobId: number) {
  const job = await db
    .selectFrom('price_update_jobs')
    .selectAll()
    .where('id', '=', jobId)
    .executeTakeFirst();

  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  const items = await db
    .selectFrom('price_update_items')
    .selectAll()
    .where('job_id', '=', jobId)
    .orderBy('id')
    .execute();

  return { ...job, items };
}
