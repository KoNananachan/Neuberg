import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSwapExecution() {
  return useQuery({
    queryKey: ['swap-execution'],
    queryFn: () => api.get<any>('/swap-execution'),
    staleTime: 60 * 60 * 1000,
  });
}
