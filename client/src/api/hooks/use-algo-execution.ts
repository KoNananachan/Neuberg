import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAlgoExecution() {
  return useQuery({
    queryKey: ['algo-execution'],
    queryFn: () => api.get<any>('/algo-execution'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
