import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 bg-white shadow-sm">
      <div className="text-xl font-bold">Token Distributor</div>
      <ConnectButton />
    </nav>
  );
} 