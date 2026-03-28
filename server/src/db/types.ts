import { Generated, Insertable, Selectable, Updateable, ColumnType } from 'kysely';

export interface Database {
  products: ProductTable;
  channels: ChannelTable;
  channel_inventory: ChannelInventoryTable;
  sales: SaleTable;
  reservations: ReservationTable;
  price_update_jobs: PriceUpdateJobTable;
  price_update_items: PriceUpdateItemTable;
}

export interface ProductTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  price: ColumnType<string, number | string, number | string>; // DECIMAL comes as string from pg
  stock: number;
  image_url: string | null;
  version: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ChannelTable {
  id: Generated<number>;
  name: string;
  type: string;
}

export interface ChannelInventoryTable {
  id: Generated<number>;
  product_id: number;
  channel_id: number;
  allocated_stock: number;
  reserved_stock: Generated<number>;
}

export interface SaleTable {
  id: Generated<number>;
  product_id: number;
  channel_id: number;
  quantity: number;
  unit_price: ColumnType<string, number | string, number | string>;
  sold_at: Generated<Date>;
}

export interface ReservationTable {
  id: Generated<number>;
  product_id: number;
  channel_id: number;
  quantity: Generated<number>;
  status: Generated<string>;
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface PriceUpdateJobTable {
  id: Generated<number>;
  status: Generated<string>;
  total_items: Generated<number>;
  completed_items: Generated<number>;
  failed_items: Generated<number>;
  created_at: Generated<Date>;
}

export interface PriceUpdateItemTable {
  id: Generated<number>;
  job_id: number;
  product_id: number;
  old_price: ColumnType<string, number | string, number | string>;
  new_price: ColumnType<string, number | string, number | string>;
  status: Generated<string>;
}

export type Product = Selectable<ProductTable>;
export type NewProduct = Insertable<ProductTable>;
export type ProductUpdate = Updateable<ProductTable>;

export type Channel = Selectable<ChannelTable>;
export type Sale = Selectable<SaleTable>;
export type Reservation = Selectable<ReservationTable>;
export type PriceUpdateJob = Selectable<PriceUpdateJobTable>;
export type PriceUpdateItem = Selectable<PriceUpdateItemTable>;
