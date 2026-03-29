import { useState, useEffect, useMemo, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ProductList } from '@/components/ProductList';
import { ChannelFilter } from '@/components/ChannelFilter';
import { SellDialog } from '@/components/SellDialog';
import { ReservationTimer } from '@/components/ReservationTimer';
import { BulkPriceUpdate } from '@/components/BulkPriceUpdate';
import { useProducts } from '@/hooks/useProducts';
import { api } from '@/api/client';
import type { Product, Reservation } from '@/types';
import { Activity } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: true, staleTime: 5000 },
  },
});

function Dashboard() {
  const { data: products, isLoading, error } = useProducts();

  const [visibleChannels, setVisibleChannels] = useState<Set<string>>(new Set());
  const [dialogProduct, setDialogProduct] = useState<Product | null>(null);
  const [dialogMode, setDialogMode] = useState<'sell' | 'reserve'>('sell');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    api.getActiveReservations().then(setReservations).catch(() => {});
  }, []);

  // Extract all unique channel names
  const allChannels = useMemo(() => {
    if (!products) {
      return [];
    }
    const set = new Set<string>();
    for (const p of products) {
      for (const ch of p.channels) {
        set.add(ch.channelName);
      }
    }
    return Array.from(set);
  }, [products]);

  // Auto-select all channels on first load
  useMemo(() => {
    if (allChannels.length > 0 && visibleChannels.size === 0) {
      setVisibleChannels(new Set(allChannels));
    }
  }, [allChannels, visibleChannels.size]);

  const handleSell = useCallback((product: Product) => {
    setDialogProduct(product);
    setDialogMode('sell');
    setDialogOpen(true);
  }, []);

  const handleReserve = useCallback((product: Product) => {
    setDialogProduct(product);
    setDialogMode('reserve');
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setDialogProduct(null);
  }, []);

  const handleReservationCreated = useCallback((reservation: Reservation) => {
    setReservations((prev) => [...prev, reservation]);
  }, []);

  const handleReservationComplete = useCallback((reservationId: number) => {
    setReservations((prev) => prev.filter((r) => r.id !== reservationId));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading products: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Unified Commerce Dashboard</h1>
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Channel filter */}
        {allChannels.length > 0 && (
          <ChannelFilter
            channels={allChannels}
            selected={visibleChannels}
            onChange={setVisibleChannels}
          />
        )}

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content: product grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : (
              <ProductList
                products={products || []}
                visibleChannels={visibleChannels}
                onSell={handleSell}
                onReserve={handleReserve}
              />
            )}
          </div>

          {/* Sidebar: reservations + bulk update */}
          <div className="space-y-4">
            <ReservationTimer
              reservations={reservations}
              onComplete={handleReservationComplete}
            />
            <BulkPriceUpdate products={products || []} />
          </div>
        </div>
      </main>

      <SellDialog
        product={dialogProduct}
        mode={dialogMode}
        open={dialogOpen}
        onClose={handleDialogClose}
        onReservationCreated={handleReservationCreated}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
