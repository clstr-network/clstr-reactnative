import { useState } from "react";
import { Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export interface NetworkFilters {
  role?: string;
  branch?: string;
  year?: string;
  location?: string;
  skills?: string[];
  company?: string;
}

interface AdvancedFiltersProps {
  filters: NetworkFilters;
  onFiltersChange: (filters: NetworkFilters) => void;
}

const ROLES = ["Student", "Alumni", "Faculty", "Industry Mentor"];
const BRANCHES = ["CSE", "ECE", "EEE", "Mechanical", "Civil", "IT", "AI/ML"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Alumni"];
const COMMON_SKILLS = [
  "React",
  "Node.js",
  "Python",
  "Java",
  "Machine Learning",
  "Data Science",
  "Web Development",
  "Mobile Development",
  "Cloud Computing",
  "DevOps",
];

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<NetworkFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = Object.values(filters).filter((v) => 
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ""
  ).length;

  const updateFilter = (key: keyof NetworkFilters, value: string | string[] | undefined) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = localFilters.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter((s) => s !== skill)
      : [...currentSkills, skill];
    updateFilter("skills", newSkills);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: NetworkFilters = {
      role: undefined,
      branch: undefined,
      year: undefined,
      location: undefined,
      skills: [],
      company: undefined,
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const removeFilter = (key: keyof NetworkFilters) => {
    const newFilters = { ...filters };
    if (key === "skills") {
      newFilters[key] = [];
    } else {
      delete newFilters[key];
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all relative" title="Filters">
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-white/20 text-[10px] text-white font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="home-theme w-full sm:max-w-md overflow-y-auto bg-[#0a0a0a] border-white/10 text-white">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-white">
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-white/50 hover:text-white hover:bg-white/[0.06]"
              >
                Clear all
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-white/50">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {filters.role && (
                  <Badge variant="secondary" className="gap-1 bg-white/[0.08] text-white/70 border-white/10">
                    Role: {filters.role}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-white"
                      onClick={() => removeFilter("role")}
                    />
                  </Badge>
                )}
                {filters.branch && (
                  <Badge variant="secondary" className="gap-1 bg-white/[0.08] text-white/70 border-white/10">
                    Branch: {filters.branch}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-white"
                      onClick={() => removeFilter("branch")}
                    />
                  </Badge>
                )}
                {filters.year && (
                  <Badge variant="secondary" className="gap-1 bg-white/[0.08] text-white/70 border-white/10">
                    Year: {filters.year}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-white"
                      onClick={() => removeFilter("year")}
                    />
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="gap-1 bg-white/[0.08] text-white/70 border-white/10">
                    Location: {filters.location}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-white"
                      onClick={() => removeFilter("location")}
                    />
                  </Badge>
                )}
                {filters.company && (
                  <Badge variant="secondary" className="gap-1 bg-white/[0.08] text-white/70 border-white/10">
                    Company: {filters.company}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-white"
                      onClick={() => removeFilter("company")}
                    />
                  </Badge>
                )}
                {filters.skills && filters.skills.length > 0 && (
                  <Badge variant="secondary" className="gap-1 bg-white/[0.08] text-white/70 border-white/10">
                    Skills: {filters.skills.length}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-white"
                      onClick={() => removeFilter("skills")}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Role Filter */}
          <div className="space-y-2">
            <Label className="text-white/70">Role</Label>
            <Select
              value={localFilters.role}
              onValueChange={(value) => updateFilter("role", value)}
            >
              <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch Filter */}
          <div className="space-y-2">
            <Label className="text-white/70">Branch</Label>
            <Select
              value={localFilters.branch}
              onValueChange={(value) => updateFilter("branch", value)}
            >
              <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-2">
            <Label className="text-white/70">Year</Label>
            <Select
              value={localFilters.year}
              onValueChange={(value) => updateFilter("year", value)}
            >
              <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <Label className="text-white/70">Location</Label>
            <Input
              placeholder="Enter location (e.g., Bangalore)"
              value={localFilters.location || ""}
              onChange={(e) => updateFilter("location", e.target.value)}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Company Filter */}
          <div className="space-y-2">
            <Label className="text-white/70">Company</Label>
            <Input
              placeholder="Enter company name"
              value={localFilters.company || ""}
              onChange={(e) => updateFilter("company", e.target.value)}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Skills Filter */}
          <div className="space-y-2">
            <Label className="text-white/70">Skills</Label>
            <div className="space-y-2">
              {COMMON_SKILLS.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={skill}
                    checked={localFilters.skills?.includes(skill)}
                    onCheckedChange={() => toggleSkill(skill)}
                    className="border-white/20 data-[state=checked]:bg-white/15 data-[state=checked]:border-white/30"
                  />
                  <label
                    htmlFor={skill}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-white/70"
                  >
                    {skill}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="mt-6 flex gap-2">
          <Button
            onClick={applyFilters}
            className="flex-1 bg-white/10 hover:bg-white/15 text-white border border-white/15"
          >
            Apply Filters
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-white/10 text-white/60 hover:bg-white/[0.06] bg-transparent">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
