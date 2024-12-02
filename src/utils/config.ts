import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { arbitrumSepolia } from "wagmi/chains"
import { http } from "viem"
import {
  argentWallet,
  trustWallet,
  ledgerWallet,
} from "@rainbow-me/rainbowkit/wallets"

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '29d61c7872beb6491c27c16145d941b9'

export const rainbowConfig = getDefaultConfig({
  appName: "GFI Airdrop",
  projectId: projectId,
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'
    ),
  },
  ssr: true,
  wallets: [
    {
      groupName: 'Other Wallets',
      wallets: [
        argentWallet,
        trustWallet,
        ledgerWallet,
      ],
    },
  ],
})

export { rainbowConfig as config }
