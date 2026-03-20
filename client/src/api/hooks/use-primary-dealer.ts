import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrimaryDealer() {
  return useQuery({
    queryKey: ['primary-dealer'],
    queryFn: () => api.get<any>('/primary-dealer'),
    staleTime: 60 * 60 * 1000,
  });
}
