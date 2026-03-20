import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDurationManagement() {
  return useQuery({
    queryKey: ['duration-management'],
    queryFn: () => api.get<any>('/duration-management'),
    staleTime: 60 * 60 * 1000,
  });
}
