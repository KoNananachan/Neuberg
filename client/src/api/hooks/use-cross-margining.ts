import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCrossMargining() {
  return useQuery({
    queryKey: ['cross-margining'],
    queryFn: () => api.get<any>('/cross-margining'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
