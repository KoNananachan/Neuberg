import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxCarry() {
  return useQuery({
    queryKey: ['fx-carry'],
    queryFn: () => api.get<any>('/fx-carry'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
