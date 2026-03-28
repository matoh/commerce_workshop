import { pool } from '../db.js';
import { AppError } from '../utils/errors.js';

// Atomic decrement — uses WHERE clause to prevent overselling
export async function sell(productId: number, channelId: number, quantity: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Atomic check-and-decrement
    const result = await client.query(
      `UPDATE channel_inventory
       SET allocated_stock = allocated_stock - $1
       WHERE product_id = $2 AND channel_id = $3
         AND allocated_stock - reserved_stock >= $1
       RETURNING allocated_stock`,
      [quantity, productId, channelId],
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(409, 'Insufficient stock');
    }

    // Also decrement total product stock
    await client.query(
      'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
      [quantity, productId],
    );

    // Get current price for the sale record
    const product = await client.query('SELECT price FROM products WHERE id = $1', [productId]);

    // Record the sale
    const sale = await client.query(
      `INSERT INTO sales (product_id, channel_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [productId, channelId, quantity, product.rows[0].price],
    );

    await client.query('COMMIT');
    return sale.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Optimistic locking — uses version column to detect concurrent modifications
export async function sellOptimistic(productId: number, channelId: number, quantity: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Read current version
    const product = await client.query(
      'SELECT version, price FROM products WHERE id = $1',
      [productId],
    );
    if (product.rows.length === 0) {
      throw new AppError(404, 'Product not found');
    }

    const { version, price } = product.rows[0];

    // Check stock availability
    const inventory = await client.query(
      `SELECT allocated_stock, reserved_stock FROM channel_inventory
       WHERE product_id = $1 AND channel_id = $2`,
      [productId, channelId],
    );
    if (inventory.rows.length === 0) {
      throw new AppError(404, 'Product not available in this channel');
    }

    const available = inventory.rows[0].allocated_stock - inventory.rows[0].reserved_stock;
    if (available < quantity) {
      throw new AppError(409, 'Insufficient stock');
    }

    // Attempt update with version check
    const updateResult = await client.query(
      `UPDATE products SET stock = stock - $1, version = version + 1, updated_at = NOW()
       WHERE id = $2 AND version = $3
       RETURNING version`,
      [quantity, productId, version],
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(409, 'Concurrent modification detected — please retry');
    }

    await client.query(
      `UPDATE channel_inventory SET allocated_stock = allocated_stock - $1
       WHERE product_id = $2 AND channel_id = $3`,
      [quantity, productId, channelId],
    );

    const sale = await client.query(
      `INSERT INTO sales (product_id, channel_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [productId, channelId, quantity, price],
    );

    await client.query('COMMIT');
    return sale.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
