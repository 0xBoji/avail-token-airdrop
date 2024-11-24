export interface Pool {
  token: string;
  totalAmount: string;
  name: string;
  isTokenAdded: boolean;
  isDistributed: boolean;
  poolType: number;
}

export enum PoolType {
  AUTO_TRANSFER,
  CLAIMABLE
} 