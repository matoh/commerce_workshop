import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent, DollarSign } from 'lucide-react';
import { api } from '@/api/client';
import type { Product, BulkPriceJob } from '@/types';

interface BulkPriceUpdateProps {
  products: Product[];
}

export function BulkPriceUpdate({ products }: BulkPriceUpdateProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<BulkPriceJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleProduct(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function selectAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  async function handleSubmit() {
    if (selectedIds.size === 0 || !value) {
      return;
    }

    setLoading(true);
    setError(null);
    setJob(null);

    try {
      const result = await api.bulkPriceUpdate({
        productIds: Array.from(selectedIds),
        adjustment: { type: adjustmentType, value: parseFloat(value) },
      });

      const jobData = await api.getBulkPriceJob(result.jobId);
      setJob(jobData);
      setSelectedIds(new Set());
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setLoading(false);
    }
  }

  const progress = job
    ? Math.round(((job.completed_items + job.failed_items) / job.total_items) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Bulk Price Update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === products.length && products.length > 0}
            onCheckedChange={selectAll}
          />
          <Label className="text-xs text-muted-foreground cursor-pointer" onClick={selectAll}>
            Select all ({selectedIds.size}/{products.length})
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <Checkbox
                checked={selectedIds.has(p.id)}
                onCheckedChange={() => toggleProduct(p.id)}
              />
              <span className="text-xs truncate">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Select
            value={adjustmentType}
            onValueChange={(v) => setAdjustmentType(v as 'percentage' | 'fixed')}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">
                <Percent className="h-3 w-3 inline mr-1" />
                Percentage
              </SelectItem>
              <SelectItem value="fixed">
                <DollarSign className="h-3 w-3 inline mr-1" />
                Fixed
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder={adjustmentType === 'percentage' ? 'e.g. -10' : 'e.g. -5.00'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || selectedIds.size === 0 || !value}
          className="w-full"
          size="sm"
        >
          {loading ? 'Updating...' : `Update ${selectedIds.size} product(s)`}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {job && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Job #{job.id} — {job.status}</span>
              <span>{job.completed_items}/{job.total_items} done</span>
            </div>
            <Progress value={progress} />
            {job.failed_items > 0 && (
              <p className="text-xs text-destructive">{job.failed_items} item(s) failed</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
