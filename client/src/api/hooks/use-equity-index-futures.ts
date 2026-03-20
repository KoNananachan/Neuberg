import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityIndexFutures() {
  return useQuery({
    queryKey: ['equity-index-futures'],
    queryFn: () => api.get<any>('/equity-index-futures'),
    staleTime: 180000,
  });
}
