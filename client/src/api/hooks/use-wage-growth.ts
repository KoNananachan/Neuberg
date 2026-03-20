import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWageGrowth() {
  return useQuery({
    queryKey: ['wage-growth'],
    queryFn: () => api.get<any>('/wage-growth'),
    staleTime: 60 * 60 * 1000,
  });
}
