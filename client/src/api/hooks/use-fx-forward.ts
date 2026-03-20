import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxForward() {
  return useQuery({
    queryKey: ['fx-forward'],
    queryFn: () => api.get<any>('/fx-forward'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
