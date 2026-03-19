import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommodityWarehouse() {
  return useQuery({
    queryKey: ['commodity-warehouse'],
    queryFn: () => api.get<any>('/commodity-warehouse'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
