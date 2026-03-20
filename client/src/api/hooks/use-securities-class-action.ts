import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSecuritiesClassAction() {
  return useQuery({
    queryKey: ['securities-class-action'],
    queryFn: () => api.get<any>('/securities-class-action'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
