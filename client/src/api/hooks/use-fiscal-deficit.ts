import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFiscalDeficit() {
  return useQuery({
    queryKey: ['fiscal-deficit'],
    queryFn: () => api.get<any>('/fiscal-deficit'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
