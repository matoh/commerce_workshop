import { Badge } from '@/components/ui/badge';

interface StockBadgeProps {
  available: number;
  channelName: string;
}

export function StockBadge({ available, channelName }: StockBadgeProps) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  let label = `${available}`;

  if (available <= 0) {
    variant = 'destructive';
    label = 'Out';
  } else if (available <= 5) {
    variant = 'outline';
  } else {
    variant = 'secondary';
  }

  return (
    <Badge variant={variant} className="text-xs">
      {channelName}: {label}
    </Badge>
  );
}
