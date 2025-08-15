'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getEvaluationCategoriesOptions } from '@/clients/api/@tanstack/react-query.gen';

interface CategoryTabsProps {
  projectId: string;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryTabs({
  projectId,
  selectedCategoryId,
  onCategoryChange,
}: CategoryTabsProps) {
  const { data: categories, isLoading } = useQuery({
    ...getEvaluationCategoriesOptions({
      path: {
        project_id: projectId,
      },
      query: {
        has_evaluations: true,
      },
    }),
  });

  if (isLoading) {
    return (
      <div className="flex gap-0 border-b">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-40 h-10 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No categories available
      </div>
    );
  }

  return (
    <div className="flex gap-0 overflow-x-auto">
      {categories.map((category, index) => (
        <Button
          key={category.id}
          variant="ghost"
          size="sm"
          className={cn(
            'w-40 flex-shrink-0 justify-center rounded-none border-r border-border/50 relative rounded-t-lg bg-muted/30 border-b border-border/50 hover:bg-muted/30 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 active:bg-muted/30',
            selectedCategoryId === category.id &&
              "bg-background text-foreground font-medium border-b-0 z-10 relative after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[1px] after:bg-background hover:bg-background focus:bg-background active:bg-background",
            index === 0 && 'border-l border-border/50'
          )}
          onClick={() => onCategoryChange(category.id)}
        >
          <span className="truncate">{category.name}</span>
        </Button>
      ))}
    </div>
  );
}
