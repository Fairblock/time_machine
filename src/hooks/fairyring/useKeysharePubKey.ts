import useFairyringKeyshare from './useFairyringKeyshare';

export const useKeysharePubKey = () => {
  const { QueryPubKey } = useFairyringKeyshare();

  return QueryPubKey({ refetchInterval: 5000 });
};
