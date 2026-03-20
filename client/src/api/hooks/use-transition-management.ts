import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTransitionManagement() {
  return useQuery({
    queryKey: ['transition-management'],
    queryFn: () => api.get<any>('/transition-management'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
