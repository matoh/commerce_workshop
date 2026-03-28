// JSON Schema definitions — shared source of truth for validation
// Used by Fastify (Ajv) on server and React Hook Form (@hookform/resolvers/ajv) on client

export const sellInputSchema = {
  type: 'object',
  properties: {
    quantity: { type: 'integer', minimum: 1 },
    channelId: { type: 'integer', minimum: 1 },
  },
  required: ['quantity', 'channelId'],
  additionalProperties: false,
} as const;

export const reserveInputSchema = {
  type: 'object',
  properties: {
    channelId: { type: 'integer', minimum: 1 },
    quantity: { type: 'integer', minimum: 1, default: 1 },
  },
  required: ['channelId'],
  additionalProperties: false,
} as const;

export const bulkPriceUpdateSchema = {
  type: 'object',
  properties: {
    productIds: {
      type: 'array',
      items: { type: 'integer', minimum: 1 },
      minItems: 1,
    },
    adjustment: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['percentage', 'fixed'] },
        value: { type: 'number' },
      },
      required: ['type', 'value'],
      additionalProperties: false,
    },
  },
  required: ['productIds', 'adjustment'],
  additionalProperties: false,
} as const;

// TypeScript types derived manually to match schemas
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
