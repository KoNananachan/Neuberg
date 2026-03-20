import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCapitalStructure() {
  return useQuery({
    queryKey: ['capital-structure'],
    queryFn: () => api.get<any>('/capital-structure'),
    staleTime: 60 * 60 * 1000,
  });
}
