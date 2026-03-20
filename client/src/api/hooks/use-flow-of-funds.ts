import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFlowOfFunds() {
  return useQuery({
    queryKey: ['flow-of-funds'],
    queryFn: () => api.get<any>('/flow-of-funds'),
    staleTime: 60 * 60 * 1000,
  });
}
