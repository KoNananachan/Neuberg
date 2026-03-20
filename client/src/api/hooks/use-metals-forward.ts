import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMetalsForward() {
  return useQuery({
    queryKey: ['metals-forward'],
    queryFn: () => api.get<any>('/metals-forward'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
