import { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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

export type ComboboxProps<T, V extends string | null> = {
  options: T[];
  value?: V | null;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onChange?: (option: T) => void;
  isOptionMatch?: (option: T, value: V | null | undefined) => boolean;
  getOptionLabel?: (option: T) => string | React.ReactNode;
  getOptionKey?: (option: T) => string;
  getOptionValue?: (option: T) => V;
  filterOption?: (
    option: T | undefined,
    value: V,
    search: string,
    keywords?: string[]
  ) => number;
  buttonClassName?: string;
  popoverClassName?: string;
};

export function Combobox<T, V extends string>({
  options,
  value,
  searchPlaceholder,
  emptyMessage,
  isOptionMatch = (option, value) => (option as unknown as V) === value,
  getOptionLabel = (option) => option as unknown as string,
  getOptionKey = (option) => option as unknown as string,
  getOptionValue = (option) => option as unknown as V,
  filterOption = (option, value, search, keywords) => {
    const extendValue = `${value}|${keywords?.join('|')}|`;
    if (extendValue.includes(search)) return 1;
    return 0;
  },
  onChange,
  buttonClassName,
  popoverClassName,
}: ComboboxProps<T, V>) {
  const optionsMap = useMemo(
    () =>
      options.reduce((acc, option) => {
        acc[getOptionValue(option)] = option;
        return acc;
      }, {} as Record<V, T>),
    [options, getOptionValue]
  );
  const optionMatch = useMemo(
    () => options.find((option) => isOptionMatch(option, value)),
    [options, value, isOptionMatch]
  );
  const optionLabel = useMemo(
    () => (optionMatch ? getOptionLabel(optionMatch) : ''),
    [optionMatch, getOptionLabel]
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-[200px] justify-between',
            !optionLabel && 'text-muted-foreground',
            buttonClassName
          )}
        >
          {optionLabel || searchPlaceholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[200px] p-0', popoverClassName)}>
        <Command
          filter={(value, search, keywords) => {
            const option = optionsMap[value as V];
            return filterOption(option, value as V, search, keywords);
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  value={getOptionValue(option)}
                  key={getOptionKey(option)}
                  onSelect={() => {
                    onChange?.(option);
                  }}
                >
                  {getOptionLabel(option)}
                  <Check
                    className={cn(
                      'ml-auto',
                      getOptionValue(option) === value
                        ? 'opacity-100'
                        : 'opacity-0'
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

export type ComboboxFieldProps<
  T,
  S extends FieldValues,
  K extends FieldPath<S>
> = {
  field: ControllerRenderProps<S, K>;
  getFieldValue?: (option: T) => ControllerRenderProps<S, K>['value'];
} & Omit<ComboboxProps<T, ControllerRenderProps<S, K>['value']>, 'value'>;

export function ComboboxField<
  T,
  S extends FieldValues,
  K extends FieldPath<S>
>({
  options,
  field,
  searchPlaceholder,
  emptyMessage,
  isOptionMatch = (option, value) => option === (value as unknown as T),
  getOptionLabel = (option) => option as unknown as string,
  getOptionKey = (option) => option as unknown as string,
  getOptionValue = (option) =>
    option as unknown as ControllerRenderProps<S, K>['value'],
  getFieldValue = (option: T) =>
    option as unknown as ControllerRenderProps<S, K>['value'],
  onChange,
}: ComboboxFieldProps<T, S, K>) {
  return (
    <Combobox
      options={options}
      value={field.value}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      isOptionMatch={isOptionMatch}
      getOptionLabel={getOptionLabel}
      getOptionKey={getOptionKey}
      getOptionValue={getOptionValue}
      onChange={(option) => {
        field.onChange(getFieldValue(option));
        onChange?.(option);
      }}
    />
  );
}
