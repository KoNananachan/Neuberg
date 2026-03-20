import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBenchmarkTracker() {
  return useQuery({
    queryKey: ['benchmark-tracker'],
    queryFn: () => api.get<any>('/benchmark-tracker'),
    staleTime: 60 * 60 * 1000,
  });
}
