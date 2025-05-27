'use client';

import { useState, useEffect } from 'react';
import { fileClassifierApi } from '@/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Components } from '@/file-classifier-api';

type EvaluationCategoryRead = Components.Schemas.EvaluationCategoryRead;

interface CategoryFilterProps {
  projectId: string;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryFilter({ projectId, selectedCategoryId, onCategoryChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<EvaluationCategoryRead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data } = await fileClassifierApi.getEvaluationCategories({
          project_id: projectId,
        });
        setCategories(data);
        
        // Auto-select the first category if none is selected
        if (data.length > 0 && !selectedCategoryId) {
          onCategoryChange(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [projectId, selectedCategoryId, onCategoryChange]);

  if (loading) {
    return <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />;
  }

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const displayText = selectedCategory ? selectedCategory.name : 'Select Category';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-48 justify-between">
          {displayText}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {categories.map((category) => (
          <DropdownMenuItem key={category.id} onClick={() => onCategoryChange(category.id)}>
            {category.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 