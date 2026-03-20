import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAssetAllocation() {
  return useQuery({
    queryKey: ['asset-allocation'],
    queryFn: () => api.get<any>('/asset-allocation'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
