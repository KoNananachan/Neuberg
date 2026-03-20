import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLeveragedLoans() {
  return useQuery({
    queryKey: ['leveraged-loans'],
    queryFn: () => api.get<any>('/leveraged-loans'),
    staleTime: 60 * 60 * 1000,
  });
}
