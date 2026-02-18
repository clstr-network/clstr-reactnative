import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BatchFilterProps {
  value: string;
  onChange: (value: string) => void;
  batches: string[];
  label?: string;
}

export const BatchFilter = ({ value, onChange, batches, label = "Batch" }: BatchFilterProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="batch-filter">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="batch-filter">
          <SelectValue placeholder="All Batches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Batches</SelectItem>
          {batches.map((batch) => (
            <SelectItem key={batch} value={batch}>
              {batch}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
