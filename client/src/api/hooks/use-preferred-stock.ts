import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePreferredStock() {
  return useQuery({
    queryKey: ['preferred-stock'],
    queryFn: () => api.get<any>('/preferred-stock'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
