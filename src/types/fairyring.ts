export type Amount = {
  amount: string;
  denom: string;
};

// block type start
type BlockId = {
  hash: string;
  parts: {
    total: number;
    hash: string;
  };
};

type Header = {
  version: { block: string };
  chain_id: string;
  height: string;
  time: string;
  last_block_id: BlockId;
  last_commit_hash: string;
  data_hash: string;
  validators_hash: string;
  next_validators_hash: string;
  consensus_hash: string;
  app_hash: string;
  last_results_hash: string;
  evidence_hash: string;
  proposer_address: string;
};

type Data = {
  txs: string[];
};

type LastCommit = {
  height: string;
  round: number;
  block_id: BlockId;
  signatures: {
    block_id_flag: number;
    validator_address: string;
    timestamp: string;
    signature: string;
  }[];
};

type Result = {
  block_id: BlockId;
  block: {
    header: Header;
    data: Data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evidence: { evidence: any[] };
    last_commit: LastCommit;
  };
};

export type BlockInfoResponse = {
  jsonrpc: string;
  id: number;
  result: Result;
};
// block type end
