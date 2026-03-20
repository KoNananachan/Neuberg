import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAITechCapex() {
  return useQuery({
    queryKey: ['ai-tech-capex'],
    queryFn: () => api.get<any>('/ai-tech-capex'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
