import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TokenDistributorABI from '../abi/TokenDistributor.json';

interface Pool {
  id: string;
  token: string;
  totalAmount: string;
  name: string;
  isTokenAdded: boolean;
  isDistributed: boolean;
  poolType: number;
}

const DISTRIBUTOR_ADDRESS = '0xdc11F523C329a2ca31247a266526e05354186934';
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

export default function PoolList() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPools();
  }, []);

  async function loadPools() {
    try {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        DISTRIBUTOR_ADDRESS,
        TokenDistributorABI,
        provider
      );

      // Get all pool IDs
      const poolIds = await contract.getAllPoolIds();
      console.log('Pool IDs:', poolIds);
      
      // Get info for each pool
      const poolsInfo = await Promise.all(
        poolIds.map(async (id: number) => {
          const info = await contract.getPoolInfo(id);
          return {
            id: id.toString(),
            token: info.token,
            totalAmount: ethers.utils.formatEther(info.totalAmount),
            name: info.name,
            isTokenAdded: info.isTokenAdded,
            isDistributed: info.isDistributed,
            poolType: info.poolType
          };
        })
      );

      console.log('Pools Info:', poolsInfo);
      setPools(poolsInfo);
      setLoading(false);
    } catch (error) {
      console.error('Error loading pools:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">All Pools</h2>
      <div className="grid gap-4">
        {pools.map((pool) => (
          <div
            key={pool.id}
            className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{pool.name}</h3>
                <p className="text-sm text-gray-600">Pool ID: {pool.id}</p>
                <p className="text-sm text-gray-600">
                  Type: {pool.poolType === 0 ? 'Auto Transfer' : 'Claimable'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Total Amount: {pool.totalAmount}
                </p>
                <div className="flex gap-2 mt-1">
                  {pool.isTokenAdded ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      Token Added
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                      Awaiting Token
                    </span>
                  )}
                  {pool.isDistributed && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      Distributed
                    </span>
                  )}
                </div>
              </div>
            </div>
            {pool.isTokenAdded && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600 font-mono">
                  Token: {pool.token}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 