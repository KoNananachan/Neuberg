import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCrossMargining() {
  return useQuery({
    queryKey: ['cross-margining'],
    queryFn: () => api.get<any>('/cross-margining'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
