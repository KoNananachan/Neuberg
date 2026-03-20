import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAITechCapex() {
  return useQuery({
    queryKey: ['ai-tech-capex'],
    queryFn: () => api.get<any>('/ai-tech-capex'),
    staleTime: 60 * 60 * 1000,
  });
}
