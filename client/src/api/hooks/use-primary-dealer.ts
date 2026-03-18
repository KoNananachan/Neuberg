import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrimaryDealer() {
  return useQuery({
    queryKey: ['primary-dealer'],
    queryFn: () => api.get<any>('/primary-dealer'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
