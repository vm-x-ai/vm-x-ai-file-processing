import { EvaluationCategoryRead } from '@/clients/api/types.gen';

/**
 * Determines if a category should be shown when it's empty.
 * The default category is hidden when empty, but other categories are shown.
 */
export function shouldShowEmptyCategory(
  category: EvaluationCategoryRead
): boolean {
  return category.name.toLowerCase() !== 'default';
}
