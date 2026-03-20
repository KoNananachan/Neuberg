import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTransitionManagement() {
  return useQuery({
    queryKey: ['transition-management'],
    queryFn: () => api.get<any>('/transition-management'),
    staleTime: 60 * 60 * 1000,
  });
}
