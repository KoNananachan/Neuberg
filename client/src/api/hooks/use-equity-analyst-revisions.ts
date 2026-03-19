import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityAnalystRevisions() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-analyst-revisions'],
    queryFn: () => api.get<any>('/equity-analyst-revisions'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
