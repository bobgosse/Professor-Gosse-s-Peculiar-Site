import useSWR from "swr";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { ProductionElement, ElementCategory } from "./useProject";

export function useElements(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ProductionElement[]>(
    projectId ? `/api/projects/${projectId}/elements` : null,
    apiGet
  );

  const createElement = async (category: ElementCategory, name: string, notes?: string): Promise<ProductionElement | undefined> => {
    if (!projectId) return undefined;
    const result = await apiPost(`/api/projects/${projectId}/elements`, {
      category,
      name,
      notes,
    }) as ProductionElement;
    await mutate();
    return result;
  };

  const deleteElement = async (elementId: string) => {
    if (!projectId) return;
    await apiDelete(`/api/projects/${projectId}/elements/${elementId}`);
    await mutate();
  };

  // Group elements by category for easy access
  const elementsByCategory = (data || []).reduce((acc, element) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push(element);
    return acc;
  }, {} as Record<ElementCategory, ProductionElement[]>);

  return {
    elements: data || [],
    elementsByCategory,
    isLoading,
    isError: !!error,
    error,
    mutate,
    createElement,
    deleteElement,
  };
}
