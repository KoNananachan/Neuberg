import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxForward() {
  return useQuery({
    queryKey: ['fx-forward'],
    queryFn: () => api.get<any>('/fx-forward'),
    staleTime: 60 * 60 * 1000,
  });
}
