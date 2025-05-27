'use client';

import { useState, useEffect, useMemo } from 'react';
import { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';
import { fileClassifierApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Components } from '@/file-classifier-api';
import { shouldShowEmptyCategory } from '@/lib/category-utils';

type EvaluationCategoryRead = Components.Schemas.EvaluationCategoryRead;

export type CategorySelectorProps = {
  projectId: string;
  value?: string | null;
  pendingCategoryName?: string | null;
  onChange?: (categoryId: string | null, categoryName?: string) => void;
  onCreateCategory?: (categoryName: string) => void;
  buttonClassName?: string;
  popoverClassName?: string;
  hideEmptyDefault?: boolean; // Whether to hide empty default categories
};

export function CategorySelector({
  projectId,
  value,
  pendingCategoryName,
  onChange,
  onCreateCategory,
  buttonClassName,
  popoverClassName,
  hideEmptyDefault = false,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<EvaluationCategoryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data } = await fileClassifierApi.getEvaluationCategories({
          project_id: projectId,
        });
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [projectId]);

  const selectedCategory = useMemo(
    () => categories.find(cat => cat.id === value),
    [categories, value]
  );

  const filteredCategories = useMemo(
    () => categories.filter(cat => {
      // Filter by search term
      const matchesSearch = cat.name.toLowerCase().includes(searchValue.toLowerCase());
      if (!matchesSearch) return false;
      
      // Filter out empty default categories if requested
      if (hideEmptyDefault && !shouldShowEmptyCategory(cat)) {
        return false;
      }
      
      return true;
    }),
    [categories, searchValue, hideEmptyDefault]
  );

  const exactMatch = useMemo(
    () => categories.find(cat => 
      cat.name.toLowerCase() === searchValue.toLowerCase()
    ),
    [categories, searchValue]
  );

  const showCreateOption = searchValue.trim() && !exactMatch;

  const handleCreateCategory = () => {
    if (searchValue.trim()) {
      onCreateCategory?.(searchValue.trim());
      onChange?.(null, searchValue.trim());
      setOpen(false);
      setSearchValue('');
    }
  };

  if (loading) {
    return <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />;
  }

  // Display logic: show selected category name, pending category name, or placeholder
  const displayText = selectedCategory 
    ? selectedCategory.name 
    : pendingCategoryName 
    ? pendingCategoryName 
    : 'Select Category';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-48 justify-between',
            !value && 'text-muted-foreground',
            buttonClassName
          )}
        >
          {displayText}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-48 p-0', popoverClassName)}>
        <Command>
          <CommandInput 
            placeholder="Search categories..." 
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue ? 'No categories found.' : 'No categories available.'}
            </CommandEmpty>
            {filteredCategories.length > 0 && (
              <CommandGroup>
                {filteredCategories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => {
                      onChange?.(category.id);
                      setOpen(false);
                      setSearchValue('');
                    }}
                  >
                    {category.name}
                    <Check
                      className={cn(
                        'ml-auto',
                        category.id === value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateOption && (
              <>
                {filteredCategories.length > 0 && <CommandSeparator />}
                <CommandGroup>
                  <CommandItem onSelect={handleCreateCategory}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create &ldquo;{searchValue}&rdquo;
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type CategorySelectorFieldProps<
  S extends FieldValues,
  K extends FieldPath<S>
> = {
  field: ControllerRenderProps<S, K>;
  projectId: string;
  onCreateCategory?: (categoryName: string) => void;
} & Omit<CategorySelectorProps, 'value' | 'onChange' | 'projectId'>;

export function CategorySelectorField<
  S extends FieldValues,
  K extends FieldPath<S>
>({
  field,
  projectId,
  onCreateCategory,
  ...props
}: CategorySelectorFieldProps<S, K>) {
  const [pendingCategoryName, setPendingCategoryName] = useState<string | null>(null);

  // Determine if the current value is a category ID or a category name
  const isValueCategoryId = typeof field.value === 'string' && field.value.match(/^[0-9a-f-]{8,}/);
  const displayValue = isValueCategoryId ? field.value : null;
  const displayPendingName = !isValueCategoryId && typeof field.value === 'string' ? field.value : pendingCategoryName;

  return (
    <CategorySelector
      projectId={projectId}
      value={displayValue}
      pendingCategoryName={displayPendingName}
      onChange={(categoryId, categoryName) => {
        if (categoryName) {
          // Store the category name for creation
          setPendingCategoryName(categoryName);
          field.onChange(categoryName);
        } else {
          setPendingCategoryName(null);
          field.onChange(categoryId);
        }
      }}
      onCreateCategory={onCreateCategory}
      {...props}
    />
  );
} 