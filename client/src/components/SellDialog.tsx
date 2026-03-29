import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/api/client';
import type { Product, Reservation } from '@/types';

interface SellDialogProps {
  product: Product | null;
  mode: 'sell' | 'reserve';
  open: boolean;
  onClose: () => void;
  onReservationCreated?: (reservation: Reservation) => void;
}

export function SellDialog({ product, mode, open, onClose, onReservationCreated }: SellDialogProps) {
  const [channelId, setChannelId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return null;
  }

  const availableChannels = product.channels.filter((ch) => ch.availableStock > 0);

  async function handleSubmit() {
    if (!product || !channelId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'sell') {
        await api.sell(product.id, { quantity, channelId: parseInt(channelId) });
      } else {
        const reservation = await api.reserve(product.id, { quantity, channelId: parseInt(channelId) });
        onReservationCreated?.(reservation);
      }
      onClose();
      setChannelId('');
      setQuantity(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'sell' ? 'Sell' : 'Reserve'} — {product.name}
          </DialogTitle>
          <DialogDescription>
            Price: ${parseFloat(product.price).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Channel</Label>
            <Select value={channelId} onValueChange={(v) => { if (v) { setChannelId(v); } }}>
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {availableChannels.map((ch) => (
                  <SelectItem key={ch.channelId} value={String(ch.channelId)}>
                    {ch.channelName} ({ch.availableStock} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !channelId}>
            {loading ? 'Processing...' : mode === 'sell' ? 'Confirm Sale' : 'Confirm Reservation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
