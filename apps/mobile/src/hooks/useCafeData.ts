import { DEFAULT_COST_SETTINGS } from '@roastcost/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Ingredient, Order, Page, Recipe, Settings } from '@/api/types';
import { useSession } from '@/store/session';

const LONG = 5 * 60_000;

export const keys = {
  settings: ['cafe', 'settings'] as const,
  ingredients: ['cafe', 'ingredients'] as const,
  recipes: ['cafe', 'recipes'] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
};

function useIsCafe() {
  return useSession((s) => !!s.me?.cafe);
}

export function useSettings() {
  const enabled = useIsCafe();
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api<Settings>('/cafe/settings'),
    staleTime: LONG,
    enabled,
    placeholderData: DEFAULT_COST_SETTINGS,
  });
}
export function useIngredients() {
  const enabled = useIsCafe();
  return useQuery({
    queryKey: keys.ingredients,
    queryFn: () => api<Ingredient[]>('/cafe/ingredients'),
    staleTime: LONG,
    enabled,
  });
}
export function useRecipes() {
  const enabled = useIsCafe();
  return useQuery({
    queryKey: keys.recipes,
    queryFn: () => api<Recipe[]>('/cafe/recipes'),
    staleTime: LONG,
    enabled,
  });
}
export function useOrders() {
  const enabled = useIsCafe();
  return useQuery({
    queryKey: keys.orders,
    queryFn: () => api<Page<Order>>('/orders?limit=50'),
    staleTime: 15_000,
    enabled,
  });
}
export function useOrder(id: string) {
  return useQuery({
    queryKey: keys.order(id),
    queryFn: () => api<Order>(`/orders/${id}`),
    staleTime: 10_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) =>
      api<Settings>('/cafe/settings', { method: 'PATCH', body: patch }),
    onSuccess: (s) => qc.setQueryData(keys.settings, s),
  });
}

export function useSaveIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Ingredient> & { id?: string }) =>
      id
        ? api<Ingredient>(`/cafe/ingredients/${id}`, { method: 'PATCH', body })
        : api<Ingredient>('/cafe/ingredients', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ingredients }),
  });
}
export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/cafe/ingredients/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ingredients }),
  });
}

export type RecipeInput = Omit<Recipe, 'id' | 'sortOrder' | 'isActive' | 'templateKey'> & {
  templateKey?: string | null;
};
export function useSaveRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: RecipeInput }) =>
      id
        ? api<Recipe>(`/cafe/recipes/${id}`, { method: 'PATCH', body })
        : api<Recipe>('/cafe/recipes', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.recipes }),
  });
}
export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/cafe/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.recipes }),
  });
}
