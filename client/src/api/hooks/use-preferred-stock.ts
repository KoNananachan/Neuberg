import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePreferredStock() {
  return useQuery({
    queryKey: ['preferred-stock'],
    queryFn: () => api.get<any>('/preferred-stock'),
    staleTime: 180000,
  });
}
