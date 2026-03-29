import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, X } from 'lucide-react';
import { api } from '@/api/client';
import type { Reservation } from '@/types';

interface ReservationTimerProps {
  reservations: Reservation[];
  onComplete: (reservationId: number) => void;
}

export function ReservationTimer({ reservations, onComplete }: ReservationTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const active = reservations.filter((r) => r.status === 'held');

  if (active.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Active Reservations ({active.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {active.map((r) => (
          <ReservationRow key={r.id} reservation={r} now={now} onComplete={onComplete} />
        ))}
      </CardContent>
    </Card>
  );
}

function ReservationRow({
  reservation,
  now,
  onComplete,
}: {
  reservation: Reservation;
  now: number;
  onComplete: (reservationId: number) => void;
}) {
  const [loading, setLoading] = useState(false);

  const expiresAt = new Date(reservation.expires_at).getTime();
  const remaining = Math.max(0, expiresAt - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining <= 0;

  async function handleComplete() {
    setLoading(true);
    try {
      await api.completeReservation(reservation.id);
      onComplete(reservation.id);
    } catch {
      // error handled by SSE refresh
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      await api.cancelReservation(reservation.id);
      onComplete(reservation.id);
    } catch {
      // error handled by SSE refresh
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="text-sm">
          Product #{reservation.product_id} x{reservation.quantity}
        </span>
        {expired ? (
          <Badge variant="destructive" className="text-xs">
            <X className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Badge>
        )}
      </div>
      {!expired && (
        <div className="flex gap-1">
          <Button size="sm" variant="default" onClick={handleComplete} disabled={loading}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {loading ? '...' : 'Sell'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
            <X className="h-3.5 w-3.5 mr-1" />
            {loading ? '...' : 'Release'}
          </Button>
        </div>
      )}
    </div>
  );
}
