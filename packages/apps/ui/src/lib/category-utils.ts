import { EvaluationCategoryRead } from '@/file-classifier-api';

/**
 * Determines if a category should be shown when it's empty.
 * The default category is hidden when empty, but other categories are shown.
 */
export function shouldShowEmptyCategory(category: EvaluationCategoryRead): boolean {
  return category.name.toLowerCase() !== 'default';
}

/**
 * Filters categories to only show those that have evaluations or should be shown when empty.
 */
export function filterVisibleCategories<T extends { category: EvaluationCategoryRead; evaluations: any[] }>(
  groups: T[]
): T[] {
  return groups.filter(group => 
    group.evaluations.length > 0 || shouldShowEmptyCategory(group.category)
  );
} 