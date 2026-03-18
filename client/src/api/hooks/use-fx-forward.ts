import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxForward() {
  return useQuery({
    queryKey: ['fx-forward'],
    queryFn: () => api.get<any>('/fx-forward'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
