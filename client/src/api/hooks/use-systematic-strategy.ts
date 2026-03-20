import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSystematicStrategy() {
  return useQuery({
    queryKey: ['systematic-strategy'],
    queryFn: () => api.get<any>('/systematic-strategy'),
    staleTime: 60 * 60 * 1000,
  });
}
