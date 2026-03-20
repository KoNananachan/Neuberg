import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxOptions() {
  return useQuery({
    queryKey: ['fx-options'],
    queryFn: () => api.get<any>('/fx-options'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
