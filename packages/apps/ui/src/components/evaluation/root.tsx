'use client';

import { Accordion } from '@/components/ui/accordion';
import { Evaluation } from '@/components/evaluation';
import { EvaluationTree, EvaluationCategoryRead } from '@/file-classifier-api';
import { FormAction, FormSchema } from './schema';
import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Check, X } from 'lucide-react';
import { fileClassifierApi } from '@/api';
import { shouldShowEmptyCategory } from '@/lib/category-utils';
import { EditableText } from '../ui/editable-text';
import { ConfirmationModal } from '../ui/confirmation-modal';

type EvaluationRootProps = {
  projectId: string;
  evaluations: EvaluationTree[];
  categories: EvaluationCategoryRead[];
  submitAction: (
    prevState: FormAction,
    data: FormSchema
  ) => Promise<FormAction>;
  onDelete: (evaluation: EvaluationTree) => Promise<void>;
};

export default function EvaluationRoot({
  projectId,
  evaluations,
  categories,
  submitAction,
  onDelete,
}: EvaluationRootProps) {
  const [data, setData] = useState<EvaluationTree[]>(evaluations);
  const [categoriesData, setCategoriesData] = useState<EvaluationCategoryRead[]>(categories);
  const [open, setOpen] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    category: EvaluationCategoryRead | null;
    canDelete: boolean;
  }>({ isOpen: false, category: null, canDelete: false });


  // Group evaluations by category
  const groupedEvaluations = useMemo(() => {
    const groups: Record<string, { category: EvaluationCategoryRead; evaluations: EvaluationTree[] }> = {};
    
    // Initialize groups for all categories
    categoriesData.forEach(category => {
      groups[category.id] = { category, evaluations: [] };
    });
    
    // Group evaluations by category
    data.forEach(evaluation => {
      if (groups[evaluation.category_id]) {
        groups[evaluation.category_id].evaluations.push(evaluation);
      }
    });
    
    // Return groups, filtering out empty default categories
    return Object.values(groups).filter(group => 
      group.evaluations.length > 0 || shouldShowEmptyCategory(group.category)
    );
  }, [data, categoriesData]);

  // Get default category for new evaluations
  const addEvaluationToCategory = (categoryId: string) => {
    const newEvaluation: EvaluationTree = {
      parent_evaluation_id: null,
      parent_evaluation_option: null,
      evaluation_type: 'text',
      description: '',
      system_prompt: '',
      prompt: '',
      title: 'Untitled',
      project_id: projectId,
      id: `new_evaluation_${data.length}`,
      evaluation_options: null,
      category_id: categoryId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      children: [],
    };

    setData([...data, newEvaluation]);
    setOpen([...open, newEvaluation.id]);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await fileClassifierApi.createEvaluationCategory({
        project_id: projectId,
      }, {
        name: newCategoryName.trim(),
        description: null,
      });
      
      setCategoriesData([...categoriesData, response.data]);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleCancelAddCategory = () => {
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleUpdateCategory = async (category: EvaluationCategoryRead, newName: string) => {
    try {
      const response = await fileClassifierApi.updateEvaluationCategory({
        project_id: projectId,
        category_id: category.id,
      }, {
        name: newName,
        description: category.description,
      });
      
      setCategoriesData(categoriesData.map(cat => 
        cat.id === category.id ? response.data : cat
      ));
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = (category: EvaluationCategoryRead) => {
    const evaluationsInCategory = data.filter(evaluation => evaluation.category_id === category.id);
    const canDelete = evaluationsInCategory.length === 0;
    
    setDeleteModal({
      isOpen: true,
      category,
      canDelete,
    });
  };

  const confirmDeleteCategory = async () => {
    if (!deleteModal.category || !deleteModal.canDelete) return;
    
    try {
      await fileClassifierApi.deleteEvaluationCategory({
        project_id: projectId,
        category_id: deleteModal.category.id,
      });
      
      setCategoriesData(categoriesData.filter(cat => cat.id !== deleteModal.category?.id));
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <>
      {groupedEvaluations.map(({ category, evaluations }, index) => (
        <div key={category.id} className={`space-y-4 ${index > 0 ? 'mt-8' : ''}`}>
          <EditableText
            value={category.name}
            onSave={(newName) => handleUpdateCategory(category, newName)}
            onDelete={() => handleDeleteCategory(category)}
            className="text-lg font-semibold text-foreground"
          />
          
          <Accordion
            type="multiple"
            value={open}
            onValueChange={(value) => {
              setOpen(value);
            }}
          >
            {evaluations.map((evaluation) => (
              <Evaluation
                key={evaluation.id}
                projectId={projectId}
                evaluation={evaluation}
                submitAction={submitAction}
                onChange={(oldEval, newEval) => {
                  setData(
                    data.map((item) => (item.id === oldEval.id ? newEval : item))
                  );

                  // Update the open state with new ID and then collapse it
                  setOpen((prevOpen) => {
                    const updatedOpen = prevOpen.map((item) => (item === oldEval.id ? newEval.id : item));
                    // Collapse all evaluations after save
                    return updatedOpen.filter(id => id !== newEval.id);
                  });
                }}
                onDelete={async (evaluation) => {
                  if (evaluation.id.startsWith('new_evaluation')) {
                    setData(data.filter((item) => item.id !== evaluation.id));
                    return;
                  }

                  await onDelete(evaluation);
                  setData(data.filter((item) => item.id !== evaluation.id));
                }}
              />
            ))}
          </Accordion>
          
          {/* Add evaluation card for this category */}
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded-xl border px-4 py-4 cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/20 transition-colors flex items-center gap-2 bg-muted/50"
            onClick={() => addEvaluationToCategory(category.id)}
          >
            <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground font-medium">Add evaluation to {category.name}</span>
          </div>
        </div>
      ))}
      
      {/* Add new category section */}
      <div className={`space-y-4 ${groupedEvaluations.length > 0 ? 'mt-8' : ''}`}>
        {!isAddingCategory ? (
          <h3 
            className="text-lg font-semibold cursor-pointer transition-colors text-muted-foreground hover:text-foreground flex items-center gap-2"
            onClick={() => setIsAddingCategory(true)}
          >
            <Plus className="h-5 w-5" />
            New Category
          </h3>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory();
                  } else if (e.key === 'Escape') {
                    handleCancelAddCategory();
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelAddCategory}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {categoriesData.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No categories found. Create a category to get started.
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, category: null, canDelete: false })}
        onConfirm={deleteModal.canDelete ? confirmDeleteCategory : undefined}
        title={deleteModal.canDelete ? "Delete Category" : "Cannot Delete Category"}
        description={
          deleteModal.canDelete
            ? `Are you sure you want to delete "${deleteModal.category?.name}"? This action cannot be undone.`
            : `Cannot delete "${deleteModal.category?.name}" because it contains evaluations. Please move or delete all evaluations in this category first.`
        }
        confirmText="Delete"
        variant={deleteModal.canDelete ? 'confirm' : 'alert'}
        destructive={deleteModal.canDelete}
      />
    </>
  );
}
