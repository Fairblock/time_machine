import { useQuery } from '@tanstack/react-query';

import { useClient } from '../useClient';

export default function useFairyringKeyshare() {
  const client = useClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const QueryParams = (options: any) => {
    const key = { type: 'QueryParams' };
    return useQuery({
      queryKey: [key],
      queryFn: () => {
        return client.FairyringKeyshare.query.queryParams().then((res) => res.data);
      },
      ...options,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const QueryPubKey = (options: any) => {
    const key = { type: 'QueryPubKey' };
    return useQuery({
      queryKey: [key],
      queryFn: () => {
        return client.FairyringKeyshare.query.queryPubKey().then((res) => res.data);
      },
      ...options,
    });
  };

  return {
    QueryParams,
    QueryPubKey,
  };
}
