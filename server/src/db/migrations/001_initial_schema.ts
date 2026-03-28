import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('products')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('price', sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn('stock', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('image_url', 'text')
    .addColumn('version', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .execute();

  await db.schema
    .createTable('channels')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('channel_inventory')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) => col.references('products.id').notNull())
    .addColumn('channel_id', 'integer', (col) => col.references('channels.id').notNull())
    .addColumn('allocated_stock', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('reserved_stock', 'integer', (col) => col.notNull().defaultTo(0))
    .addUniqueConstraint('channel_inventory_product_channel_unique', ['product_id', 'channel_id'])
    .execute();

  await db.schema
    .createTable('sales')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) => col.references('products.id').notNull())
    .addColumn('channel_id', 'integer', (col) => col.references('channels.id').notNull())
    .addColumn('quantity', 'integer', (col) => col.notNull())
    .addColumn('unit_price', sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn('sold_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .execute();

  await db.schema
    .createTable('reservations')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) => col.references('products.id').notNull())
    .addColumn('channel_id', 'integer', (col) => col.references('channels.id').notNull())
    .addColumn('quantity', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('held'))
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .execute();

  await db.schema
    .createTable('price_update_jobs')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('total_items', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('completed_items', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('failed_items', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`))
    .execute();

  await db.schema
    .createTable('price_update_items')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('job_id', 'integer', (col) => col.references('price_update_jobs.id').notNull())
    .addColumn('product_id', 'integer', (col) => col.references('products.id').notNull())
    .addColumn('old_price', sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn('new_price', sql`decimal(10,2)`, (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .execute();

  // Indexes
  await db.schema
    .createIndex('idx_reservations_active')
    .on('reservations')
    .columns(['product_id', 'status', 'expires_at'])
    .where('status', '=', 'held')
    .execute();

  await db.schema
    .createIndex('idx_channel_inventory_product')
    .on('channel_inventory')
    .column('product_id')
    .execute();

  await db.schema
    .createIndex('idx_sales_product')
    .on('sales')
    .columns(['product_id', 'sold_at'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('price_update_items').execute();
  await db.schema.dropTable('price_update_jobs').execute();
  await db.schema.dropTable('reservations').execute();
  await db.schema.dropTable('sales').execute();
  await db.schema.dropTable('channel_inventory').execute();
  await db.schema.dropTable('channels').execute();
  await db.schema.dropTable('products').execute();
}
