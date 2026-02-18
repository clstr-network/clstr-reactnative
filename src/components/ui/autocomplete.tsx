import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  allowCustomValue?: boolean;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  icon,
  allowCustomValue = true,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);

  // Sync inputValue with value prop
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter options based on input - minimum 2 characters
  const filteredOptions = React.useMemo(() => {
    const search = inputValue.trim().toLowerCase();
    if (!search) {
      return options.slice(0, 10);
    }
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(search) ||
        option.value.toLowerCase().includes(search)
    ).slice(0, 10); // Limit to 10 results for performance
  }, [options, inputValue]);

  const handleSelect = (selectedValue: string) => {
    const option = options.find(
      (opt) => opt.value.toLowerCase() === selectedValue.toLowerCase()
    );
    const newValue = option?.label || selectedValue;
    setInputValue(newValue);
    onChange(newValue);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    if (allowCustomValue) {
      onChange(newValue);
    }
    if (!open) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              {icon}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full h-11 justify-between font-normal text-sm",
              icon && "pl-10",
              !value && "text-white/60"
            )}
          >
            <span className="truncate text-left">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={handleInputChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            className="h-10 text-sm"
          />
          <CommandList className="max-h-[200px] sm:max-h-[300px]">
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : null}
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value.toLowerCase() === option.label.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
