import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrumSepolia } from 'wagmi/chains'
import { http } from 'viem'

const projectId = '29d61c7872beb6491c27c16145d941b9'

export const wagmiConfig = getDefaultConfig({
  appName: 'GFI Airdrop',
  projectId: projectId,
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc')
  },
  ssr: true
})

export const chains = [arbitrumSepolia] 