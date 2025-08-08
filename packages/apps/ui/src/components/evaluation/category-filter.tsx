'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getEvaluationCategoriesOptions } from '@/clients/api/@tanstack/react-query.gen';

interface CategoryFilterProps {
  projectId: string;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryFilter({
  projectId,
  selectedCategoryId,
  onCategoryChange,
}: CategoryFilterProps) {
  const { data: categories, isLoading } = useQuery({
    ...getEvaluationCategoriesOptions({
      path: {
        project_id: projectId,
      },
    }),
  });

  useEffect(() => {
    if (!categories) return;

    // Auto-select the first category if none is selected
    if (categories?.length > 0 && !selectedCategoryId) {
      onCategoryChange(categories[0].id);
    }
  }, [projectId, selectedCategoryId, onCategoryChange, categories]);

  if (isLoading) {
    return <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />;
  }

  const selectedCategory = categories?.find(
    (cat) => cat.id === selectedCategoryId
  );

  const displayText = selectedCategory
    ? selectedCategory.name
    : 'Select Category';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-48 justify-between">
          {displayText}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {categories?.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
