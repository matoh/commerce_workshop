import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ChannelFilterProps {
  channels: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function ChannelFilter({ channels, selected, onChange }: ChannelFilterProps) {
  function toggle(channel: string) {
    const next = new Set(selected);
    if (next.has(channel)) {
      next.delete(channel);
    } else {
      next.add(channel);
    }
    onChange(next);
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground">Channels:</span>
      {channels.map((ch) => (
        <div key={ch} className="flex items-center gap-1.5">
          <Checkbox
            id={`ch-${ch}`}
            checked={selected.has(ch)}
            onCheckedChange={() => toggle(ch)}
          />
          <Label htmlFor={`ch-${ch}`} className="text-sm capitalize cursor-pointer">
            {ch.replace('_', ' ')}
          </Label>
        </div>
      ))}
    </div>
  );
}
