import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConvertibleBonds() {
  return useQuery({
    queryKey: ['convertible-bonds'],
    queryFn: () => api.get<any>('/convertible-bonds'),
    staleTime: 60 * 60 * 1000,
  });
}
