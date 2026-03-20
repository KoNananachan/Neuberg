import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCustomIndex() {
  return useQuery({
    queryKey: ['custom-index'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/custom-index'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
