"use client"

import { WriteContract } from "@/containers/write/WriteContract"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"
import { toast } from "react-hot-toast"
import TokenDistributorABI from "@/abi/TokenDistributor.json"
import { parseAbi } from 'viem'

function WriteExample() {
  const { isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const distributeTokens = async (poolId: string) => {
    try {
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }

      const address = process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS as `0x${string}`
      if (!address) {
        throw new Error('Contract address not configured');
      }

      // Convert ABI to viem format
      const abi = parseAbi(TokenDistributorABI)

      // Read pool info first
      const poolInfo = await publicClient.readContract({
        address,
        abi,
        functionName: 'getPoolInfo',
        args: [BigInt(poolId)]
      })

      console.log('Pool info:', poolInfo)

      if (!poolInfo[3]) { // isTokenAdded
        throw new Error('Token must be added to the pool before distribution')
      }

      if (poolInfo[4]) { // isDistributed
        throw new Error('Pool has already been distributed')
      }

      // Get participants
      const participants = await publicClient.readContract({
        address,
        abi,
        functionName: 'getParticipants',
        args: [BigInt(poolId)]
      })

      console.log('Participants:', participants)

      if (!participants || (participants as any[]).length === 0) {
        throw new Error('No participants in the pool')
      }

      // Simulate the transaction first
      const { request } = await publicClient.simulateContract({
        address,
        abi,
        functionName: 'distributeToAll',
        args: [BigInt(poolId), BigInt(5)], // Using small batch size
        account: walletClient.account
      })

      console.log('Simulation successful, sending transaction...')

      // Send the transaction
      const hash = await walletClient.writeContract(request)
      console.log('Transaction hash:', hash)

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      console.log('Transaction receipt:', receipt)

      toast.success('Tokens distributed successfully!')
    } catch (error: any) {
      console.error('Error with distribution:', error)

      // Handle specific error cases
      if (error.message.includes('Token not added')) {
        toast.error('Please add token to the pool before distributing')
      } else if (error.message.includes('Already distributed')) {
        toast.error('Tokens have already been distributed for this pool')
      } else if (error.message.includes('execution reverted')) {
        toast.error('Transaction failed: Check token balance and allowance')
      } else {
        toast.error(`Failed to distribute tokens: ${error.message || 'Unknown error'}`)
      }
    }
  }

  return (
    <div>
      {isConnected ? (
        <WriteContract onDistribute={distributeTokens} />
      ) : (
        <div className="text-center text-2xl my-8">
          Please Connect the Wallet
        </div>
      )}
    </div>
  )
}

export default WriteExample
