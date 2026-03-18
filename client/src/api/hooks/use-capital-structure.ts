import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCapitalStructure() {
  return useQuery({
    queryKey: ['capital-structure'],
    queryFn: () => api.get<any>('/capital-structure'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
