import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  label?: string;
}

export const DateRangeFilter = ({ 
  dateFrom, 
  dateTo, 
  onDateFromChange, 
  onDateToChange,
  label = "Date Range" 
}: DateRangeFilterProps) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        {label}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="date-from" className="text-xs text-white/60">
            From
          </Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date-to" className="text-xs text-white/60">
            To
          </Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
};
