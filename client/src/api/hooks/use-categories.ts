import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface Category {
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  _count: { articles: number };
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 60 * 60_000,
    gcTime: 60 * 60_000,
  });
}
