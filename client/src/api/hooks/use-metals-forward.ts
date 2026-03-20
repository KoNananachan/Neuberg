import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMetalsForward() {
  return useQuery({
    queryKey: ['metals-forward'],
    queryFn: () => api.get<any>('/metals-forward'),
    staleTime: 60 * 60 * 1000,
  });
}
