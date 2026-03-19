import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityIndexFutures() {
  return useQuery({
    queryKey: ['equity-index-futures'],
    queryFn: () => api.get<any>('/equity-index-futures'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
