import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLaborMarket() {
  return useQuery({
    queryKey: ['labor-market'],
    queryFn: () => api.get<any>('/labor-market'),
    staleTime: 60 * 60 * 1000,
  });
}
