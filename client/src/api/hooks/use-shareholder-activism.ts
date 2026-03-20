import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useShareholderActivism() {
  return useQuery({
    queryKey: ['shareholder-activism'],
    queryFn: () => api.get<any>('/shareholder-activism'),
    staleTime: 60 * 60 * 1000,
  });
}
