import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
  departments: string[];
  label?: string;
}

export const DepartmentFilter = ({ 
  value, 
  onChange, 
  departments, 
  label = "Department" 
}: DepartmentFilterProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="department-filter">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="department-filter">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
