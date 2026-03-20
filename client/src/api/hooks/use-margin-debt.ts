import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMarginDebt() {
  return useQuery({
    queryKey: ['margin-debt'],
    queryFn: () => api.get<any>('/margin-debt'),
    staleTime: 60 * 60 * 1000,
  });
}
