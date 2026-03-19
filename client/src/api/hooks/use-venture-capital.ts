import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVentureCapital() {
  return useQuery({
    queryKey: ['venture-capital'],
    queryFn: () => api.get<any>('/venture-capital'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
