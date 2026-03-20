import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAssetAllocation() {
  return useQuery({
    queryKey: ['asset-allocation'],
    queryFn: () => api.get<any>('/asset-allocation'),
    staleTime: 60 * 60 * 1000,
  });
}
