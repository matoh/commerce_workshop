import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockBadge } from './StockBadge';
import { ShoppingCart, Clock } from 'lucide-react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  visibleChannels: Set<string>;
  onSell: (product: Product) => void;
  onReserve: (product: Product) => void;
}

export function ProductCard({ product, visibleChannels, onSell, onReserve }: ProductCardProps) {
  const filteredChannels = product.channels.filter((ch) =>
    visibleChannels.has(ch.channelName),
  );

  const totalAvailable = filteredChannels.reduce((sum, ch) => sum + ch.availableStock, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{product.name}</CardTitle>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
            )}
          </div>
          <span className="text-lg font-semibold">${parseFloat(product.price).toFixed(2)}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-32 object-cover rounded-md mb-3"
          />
        )}
        <div className="flex flex-wrap gap-1.5">
          {filteredChannels.map((ch) => (
            <StockBadge
              key={ch.channelId}
              available={ch.availableStock}
              channelName={ch.channelName}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Total available: {totalAvailable} | Global stock: {product.stock}
        </p>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onSell(product)}
          disabled={totalAvailable <= 0}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Sell
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onReserve(product)}
          disabled={totalAvailable <= 0}
        >
          <Clock className="h-4 w-4 mr-1" />
          Reserve
        </Button>
      </CardFooter>
    </Card>
  );
}
