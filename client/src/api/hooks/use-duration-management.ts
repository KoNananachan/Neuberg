import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDurationManagement() {
  return useQuery({
    queryKey: ['duration-management'],
    queryFn: () => api.get<any>('/duration-management'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
