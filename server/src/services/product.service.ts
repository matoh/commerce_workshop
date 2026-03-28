import { pool } from '../db.js';
import { AppError } from '../utils/errors.js';

export async function listProducts() {
  const result = await pool.query(`
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
  `);

  return result.rows;
}

export async function getProductById(id: number) {
  const result = await pool.query(
    `
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
    WHERE p.id = $1
    GROUP BY p.id
    `,
    [id],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Product not found');
  }

  return result.rows[0];
}

export async function bulkUpdatePrice(
  productIds: number[],
  adjustment: { type: 'percentage' | 'fixed'; value: number },
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create job
    const jobResult = await client.query(
      `INSERT INTO price_update_jobs (status, total_items) VALUES ('running', $1) RETURNING id`,
      [productIds.length],
    );
    const jobId = jobResult.rows[0].id;

    let completedItems = 0;
    let failedItems = 0;

    for (const productId of productIds) {
      try {
        const product = await client.query('SELECT price FROM products WHERE id = $1', [productId]);
        if (product.rows.length === 0) {
          failedItems++;
          await client.query(
            `INSERT INTO price_update_items (job_id, product_id, old_price, new_price, status)
             VALUES ($1, $2, 0, 0, 'failed')`,
            [jobId, productId],
          );
          continue;
        }

        const oldPrice = parseFloat(product.rows[0].price);
        const newPrice =
          adjustment.type === 'percentage'
            ? oldPrice * (1 + adjustment.value / 100)
            : oldPrice + adjustment.value;

        await client.query(
          'UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2',
          [Math.round(newPrice * 100) / 100, productId],
        );

        await client.query(
          `INSERT INTO price_update_items (job_id, product_id, old_price, new_price, status)
           VALUES ($1, $2, $3, $4, 'applied')`,
          [jobId, productId, oldPrice, Math.round(newPrice * 100) / 100],
        );

        completedItems++;
      } catch {
        failedItems++;
      }
    }

    await client.query(
      `UPDATE price_update_jobs SET status = 'completed', completed_items = $1, failed_items = $2 WHERE id = $3`,
      [completedItems, failedItems, jobId],
    );

    await client.query('COMMIT');
    return { jobId, completedItems, failedItems };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getBulkPriceJob(jobId: number) {
  const job = await pool.query('SELECT * FROM price_update_jobs WHERE id = $1', [jobId]);
  if (job.rows.length === 0) {
    throw new AppError(404, 'Job not found');
  }

  const items = await pool.query(
    'SELECT * FROM price_update_items WHERE job_id = $1 ORDER BY id',
    [jobId],
  );

  return { ...job.rows[0], items: items.rows };
}
