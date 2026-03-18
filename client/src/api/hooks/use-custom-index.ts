import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCustomIndex() {
  return useQuery({
    queryKey: ['custom-index'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/custom-index'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
