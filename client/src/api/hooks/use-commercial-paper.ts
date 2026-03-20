import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommercialPaper() {
  return useQuery({
    queryKey: ['commercial-paper'],
    queryFn: () => api.get<any>('/commercial-paper'),
    staleTime: 180000,
  });
}
