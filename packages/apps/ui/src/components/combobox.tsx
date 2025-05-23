import {
  ControllerRenderProps,
  FieldPath,
  FieldPathValue,
  FieldValues,
} from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { FormControl } from './ui/form';
import { Button } from './ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export type ComboboxProps<T, S extends FieldValues, K extends FieldPath<S>> = {
  options: T[];
  field: ControllerRenderProps<S, K>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onChange?: (option: T) => void;
  isOptionMatch?: (option: T, value: FieldPathValue<S, K>) => boolean;
  getOptionLabel?: (option: T) => string;
  getOptionKey?: (option: T) => string;
  getOptionValue?: (option: T) => string;
};

export default function Combobox<
  T,
  S extends FieldValues,
  K extends FieldPath<S>
>({
  options,
  field,
  searchPlaceholder,
  emptyMessage,
  isOptionMatch = (option, value) => option === value,
  getOptionLabel = (option) => option as unknown as string,
  getOptionKey = (option) => option as unknown as string,
  getOptionValue = (option) => option as unknown as string,
  onChange,
}: ComboboxProps<T, S, K>) {
  const optionMatch = useMemo(
    () => options.find((option) => isOptionMatch(option, field.value)),
    [options, field.value, isOptionMatch]
  );
  const optionLabel = useMemo(
    () => (optionMatch ? getOptionLabel(optionMatch) : ''),
    [optionMatch, getOptionLabel]
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              'w-[200px] justify-between',
              !field.value && 'text-muted-foreground'
            )}
          >
            {field.value ? optionLabel : 'Select option'}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  value={getOptionValue(option)}
                  key={getOptionKey(option)}
                  onSelect={() => {
                    field.onChange(option);
                    onChange?.(option);
                  }}
                >
                  {getOptionLabel(option)}
                  <Check
                    className={cn(
                      'ml-auto',
                      option === field.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
