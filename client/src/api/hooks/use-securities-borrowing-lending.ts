import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSecuritiesBorrowingLending() {
  return useQuery({
    queryKey: ['securities-borrowing-lending'],
    queryFn: () => api.get<any>('/securities-borrowing-lending'),
    staleTime: 180000,
  });
}
