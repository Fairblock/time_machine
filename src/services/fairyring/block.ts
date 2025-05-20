import { PUBLIC_ENVIRONMENT } from '@/constant/env';
import { useQueries } from '@tanstack/react-query';
import { BlockInfoResponse } from '@/types/fairyring';

export const getBlockInfo = async (): Promise<BlockInfoResponse> => {
  const blockInfoRes = await fetch(`${PUBLIC_ENVIRONMENT.NEXT_PUBLIC_TENDERMINT_URL}/block`);
  const blockInfo: BlockInfoResponse = await blockInfoRes.json();
  return blockInfo;
};

export interface BlockInfo {
  height: number;
  timestamp: Date;
}

export const getCurrentBlockInfo = async (): Promise<BlockInfo> => {
  const blockInfo = await getBlockInfo();

  // the block your node just committed
  const lastCommitHeight = blockInfo.result.block.last_commit.height;
  const height = Number(lastCommitHeight) + 1;

  // the time that block was proposed
  const timestamp = new Date(blockInfo.result.block.header.time);

  return { height, timestamp };
};

export const getCurrentBlockHeight = async (): Promise<number> => {
  const blockInfo = await getBlockInfo();
  const lastCommitHeight = blockInfo.result.block.last_commit.height;
  const currentHeight = Number(lastCommitHeight) + 1;
  return currentHeight;
};

export const getBlock = async (blockNumber: number | string) => {
  const apiUrl = `${PUBLIC_ENVIRONMENT.NEXT_PUBLIC_TENDERMINT_URL}/block_results?height=${blockNumber}`;
  const blockData = await fetch(apiUrl);
  return await blockData.json();
};

export const useBlocks = (blocks: number[] | string[]) => {
  const res = useQueries({
    queries: blocks.map((block) => ({
      queryKey: ['get_block', block],
      queryFn: () => getBlock(block),
    })),
  });

  return { blockQueries: res };
};