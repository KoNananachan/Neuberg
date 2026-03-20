import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCrossMargining() {
  return useQuery({
    queryKey: ['cross-margining'],
    queryFn: () => api.get<any>('/cross-margining'),
    staleTime: 60 * 60 * 1000,
  });
}
