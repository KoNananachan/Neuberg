import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAssetAllocation() {
  return useQuery({
    queryKey: ['asset-allocation'],
    queryFn: () => api.get<any>('/asset-allocation'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
