export interface ChannelInventory {
  channelId: number;
  channelName: string;
  channelType: string;
  allocatedStock: number;
  reservedStock: number;
  availableStock: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  channels: ChannelInventory[];
}

export interface Sale {
  id: number;
  product_id: number;
  channel_id: number;
  quantity: number;
  unit_price: string;
  sold_at: string;
}

export interface Reservation {
  id: number;
  product_id: number;
  channel_id: number;
  quantity: number;
  status: 'held' | 'completed' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface BulkPriceJob {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'rolled_back';
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  items: BulkPriceItem[];
}

export interface BulkPriceItem {
  id: number;
  job_id: number;
  product_id: number;
  old_price: string;
  new_price: string;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
}

export interface HealthResponse {
  status: string;
  instanceId: string;
  timestamp: string;
  redis: string;
  connections: { db: number; dbIdle: number };
}

export interface SellInput {
  quantity: number;
  channelId: number;
}

export interface ReserveInput {
  channelId: number;
  quantity?: number;
}

export interface BulkPriceUpdateInput {
  productIds: number[];
  adjustment: {
    type: 'percentage' | 'fixed';
    value: number;
  };
}
