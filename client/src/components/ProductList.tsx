import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

interface ProductListProps {
  products: Product[];
  visibleChannels: Set<string>;
  onSell: (product: Product) => void;
  onReserve: (product: Product) => void;
}

export function ProductList({ products, visibleChannels, onSell, onReserve }: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No products found.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          visibleChannels={visibleChannels}
          onSell={onSell}
          onReserve={onReserve}
        />
      ))}
    </div>
  );
}
