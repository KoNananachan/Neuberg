import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVentureCapital() {
  return useQuery({
    queryKey: ['venture-capital'],
    queryFn: () => api.get<any>('/venture-capital'),
    staleTime: 60 * 60 * 1000,
  });
}
