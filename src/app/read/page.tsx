"use client"
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TokenDistributorABI from '../../abi/TokenDistributor.json';

interface Pool {
  token: string;
  totalAmount: string;
  name: string;
  isTokenAdded: boolean;
  isDistributed: boolean;
  poolType: number;
}

export default function ReadContract() {
  const [pools, setPools] = useState<{ id: string; info: Pool }[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [participants, setParticipants] = useState<{ address: string; amount: string }[]>([]);

  useEffect(() => {
    loadPools();
  }, []);

  useEffect(() => {
    if (selectedPool) {
      loadParticipants(selectedPool);
    }
  }, [selectedPool]);

  async function loadPools() {
    try {
      const provider = new ethers.providers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS!,
        TokenDistributorABI,
        provider
      );

      // Get all pool IDs
      const poolIds = await contract.getAllPoolIds();
      
      // Get info for each pool
      const poolsInfo = await Promise.all(
        poolIds.map(async (id: number) => {
          const info = await contract.getPoolInfo(id);
          return {
            id: id.toString(),
            info: {
              token: info.token,
              totalAmount: ethers.utils.formatEther(info.totalAmount),
              name: info.name,
              isTokenAdded: info.isTokenAdded,
              isDistributed: info.isDistributed,
              poolType: info.poolType
            }
          };
        })
      );

      setPools(poolsInfo);
    } catch (error) {
      console.error('Error loading pools:', error);
    }
  }

  async function loadParticipants(poolId: string) {
    try {
      const provider = new ethers.providers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS!,
        TokenDistributorABI,
        provider
      );

      const addresses = await contract.getParticipants(poolId);
      const participantsInfo = await Promise.all(
        addresses.map(async (address: string) => {
          const amount = await contract.getClaimableAmount(poolId, address);
          return {
            address,
            amount: ethers.utils.formatEther(amount)
          };
        })
      );

      setParticipants(participantsInfo);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-purple-300 to-indigo-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-white">Pool Information</h1>

        {/* Pools List */}
        <div className="grid gap-6 mb-8">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="glass-container rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedPool(pool.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{pool.info.name}</h2>
                  <p className="text-sm text-gray-600">Pool ID: {pool.id}</p>
                  <p className="text-sm text-gray-600">
                    Type: {pool.info.poolType === 0 ? 'Auto Transfer' : 'Claimable'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Amount: {pool.info.totalAmount}</p>
                  <p className="text-sm text-gray-600">
                    Status: {pool.info.isDistributed ? 'Distributed' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Token Info */}
              {pool.info.isTokenAdded && (
                <div className="mt-4 p-4 bg-white/50 rounded-lg">
                  <p className="text-sm text-gray-600">Token: {pool.info.token}</p>
                </div>
              )}

              {/* Participants List */}
              {selectedPool === pool.id && participants.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Participants</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {participants.map((participant, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                              {participant.address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {participant.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
