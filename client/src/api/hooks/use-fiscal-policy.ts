import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFiscalPolicy() {
  return useQuery({
    queryKey: ['fiscal-policy'],
    queryFn: () => api.get<any>('/fiscal-policy'),
    staleTime: 60 * 60 * 1000,
  });
}
