"use client"

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenDistributorABI from '../abi/TokenDistributor.json';
import AvailTokenABI from '../abi/AvailToken.json';
import * as XLSX from 'xlsx';
import AddTokenModal from '../components/AddTokenModal';

interface AddressAmount {
  address: string;
  amount: string;
}

export default function Home() {
  const [account, setAccount] = useState('');
  const [poolId, setPoolId] = useState('');
  const [poolType, setPoolType] = useState('auto'); // 'auto' or 'claim'
  const [poolName, setPoolName] = useState('');
  const [addresses, setAddresses] = useState('');
  const [amounts, setAmounts] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [addressAmounts, setAddressAmounts] = useState<AddressAmount[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
  const [isTokenAdded, setIsTokenAdded] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');

  // Connect wallet
  async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    }
  }

  // Create Pool
  async function createPool() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS!, TokenDistributorABI, signer);

      if (poolType === 'auto') {
        const tx = await contract.createAutoPool(poolName);
        await tx.wait();
      } else {
        const tx = await contract.createClaimPool(poolName);
        await tx.wait();
      }
    } catch (error) {
      console.error('Error creating pool:', error);
    }
  }

  // Add Addresses
  async function addAddresses() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS!, TokenDistributorABI, signer);

      const addressList = addresses.split('\n').map(addr => addr.trim());
      const amountList = amounts.split('\n').map(amt => ethers.utils.parseEther(amt));

      const tx = await contract.addAddressesToPool(poolId, addressList, amountList);
      await tx.wait();
    } catch (error) {
      console.error('Error adding addresses:', error);
    }
  }

  // Add Token to Pool
  async function addTokenToPool() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS!, TokenDistributorABI, signer);

      // First approve the token transfer
      const tokenContract = new ethers.Contract(tokenAddress, AvailTokenABI, signer);
      const totalAmount = await contract.getPoolInfo(poolId).then(info => info.totalAmount);
      
      console.log('Approving tokens...');
      const approveTx = await tokenContract.approve(process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS, totalAmount);
      await approveTx.wait();
      console.log('Tokens approved');

      // Then add token to pool
      console.log('Adding token to pool...');
      const tx = await contract.addTokenToPool(poolId, tokenAddress);
      await tx.wait();
      console.log('Token added to pool successfully');
      
      // Set token added state to true
      setIsTokenAdded(true);
      setIsAddTokenModalOpen(false);
    } catch (error) {
      console.error('Error adding token to pool:', error);
    }
  }

  // Distribute or Claim
  async function handleDistribution() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS!, TokenDistributorABI, signer);

      if (poolType === 'auto') {
        const tx = await contract.distributeToAll(poolId);
        await tx.wait();
      } else {
        const tx = await contract.claim(poolId);
        await tx.wait();
      }
    } catch (error) {
      console.error('Error with distribution:', error);
    }
  }

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as { Address: string; Amount: number }[];

        const formattedData = jsonData.map(row => ({
          address: row.Address,
          amount: row.Amount.toString()
        }));

        setAddressAmounts(formattedData);
        // Also update the text areas for compatibility
        setAddresses(formattedData.map(item => item.address).join('\n'));
        setAmounts(formattedData.map(item => item.amount).join('\n'));
      } catch (error) {
        console.error('Error parsing Excel file:', error);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleEditSave = (index: number) => {
    if (editAddress && editAmount) {
      const newAddressAmounts = [...addressAmounts];
      newAddressAmounts[index] = {
        address: editAddress,
        amount: editAmount
      };
      setAddressAmounts(newAddressAmounts);
      setEditingIndex(null);
      setEditAddress('');
      setEditAmount('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-300 via-purple-300 to-indigo-400">
      {/* Header */}
      <header className="glass-container sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img 
                src="/images/avail.png" 
                alt="AVAIL Logo" 
                className="h-8 w-8 rounded-full"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                AVAIL Token Distribution
              </h1>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Create Pool Card */}
          <div className="float-card glass-container rounded-xl p-6 hover:shadow-lg transition-all">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Create Pool</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <select 
                  value={poolType} 
                  onChange={(e) => setPoolType(e.target.value)}
                  className="input appearance-none pr-10 bg-white"
                >
                  <option value="auto">Auto Transfer</option>
                  <option value="claim">Claimable</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <input
                type="text"
                placeholder="Pool Name"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                className="input flex-1"
              />
              <button 
                onClick={createPool}
                className="btn btn-primary min-w-[120px] flex items-center justify-center gap-2"
              >
                <span>Create Pool</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add Addresses Card */}
          <div className="float-card glass-container rounded-xl p-6 hover:shadow-lg transition-all">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Add Addresses</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="number"
                  placeholder="Pool ID"
                  value={selectedPoolId}
                  onChange={(e) => {
                    setSelectedPoolId(e.target.value);
                    setPoolId(e.target.value); // Keep the existing poolId state in sync
                  }}
                  className="input sm:max-w-[200px]"
                />
                
                {/* Excel Upload */}
                <div className="flex-1 flex items-center gap-4">
                  <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Excel
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-sm text-gray-600">
                    Excel format: Column A for addresses, Column B for amounts
                  </span>
                </div>
              </div>

              {/* Address Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {addressAmounts.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingIndex === index ? (
                            <input
                              type="text"
                              value={editAddress || item.address}
                              onChange={(e) => setEditAddress(e.target.value)}
                              className="input"
                              placeholder="Enter address"
                            />
                          ) : (
                            <span className="font-mono text-sm text-gray-600">{item.address}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingIndex === index ? (
                            <input
                              type="text"
                              value={editAmount || item.amount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="input"
                              placeholder="Enter amount"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{item.amount}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {editingIndex === index ? (
                              <>
                                <button
                                  onClick={() => handleEditSave(index)}
                                  className="text-green-600 hover:text-green-900 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingIndex(null);
                                    setEditAddress('');
                                    setEditAmount('');
                                  }}
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingIndex(index);
                                    setEditAddress(item.address);
                                    setEditAmount(item.amount);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    const newAddressAmounts = [...addressAmounts];
                                    newAddressAmounts.splice(index, 1);
                                    setAddressAmounts(newAddressAmounts);
                                  }}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Add New Row */}
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="input"
                          placeholder="Enter new address"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="input"
                          placeholder="Enter amount"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            if (editAddress && editAmount) {
                              setAddressAmounts([
                                ...addressAmounts,
                                { address: editAddress, amount: editAmount }
                              ]);
                              setEditAddress('');
                              setEditAmount('');
                            }
                          }}
                          className="btn btn-primary"
                        >
                          Add Row
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                {selectedPoolId ? (
                  <button 
                    onClick={() => setIsAddTokenModalOpen(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Token
                  </button>
                ) : (
                  <button 
                    className="btn btn-secondary flex items-center gap-2 opacity-50 cursor-not-allowed"
                    title="Please enter Pool ID first"
                    disabled
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V7a3 3 0 00-3-3V4" />
                    </svg>
                    Enter Pool ID First
                  </button>
                )}
                <button 
                  onClick={addAddresses}
                  className="btn btn-primary"
                  disabled={addressAmounts.length === 0 || !isTokenAdded}
                  title={!isTokenAdded ? "Please add token first" : ""}
                >
                  {!isTokenAdded ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V7a3 3 0 00-3-3V4" />
                      </svg>
                      Add Token First
                    </div>
                  ) : (
                    "Add Addresses to Pool"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Add Token Modal */}
          <AddTokenModal
            isOpen={isAddTokenModalOpen}
            closeModal={() => setIsAddTokenModalOpen(false)}
            poolId={selectedPoolId}
            tokenAddress={tokenAddress}
            setTokenAddress={setTokenAddress}
            onAddToken={addTokenToPool}
          />

          {/* Distribution/Claim Card */}
          {poolType === 'auto' && (
            <div className="float-card glass-container rounded-xl p-6 hover:shadow-lg transition-all">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Distribute Tokens</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="number"
                  placeholder="Pool ID"
                  value={poolId}
                  onChange={(e) => setPoolId(e.target.value)}
                  className="input sm:max-w-[200px]"
                />
                <button 
                  onClick={handleDistribution}
                  className="btn btn-primary min-w-[120px] flex items-center justify-center gap-2"
                >
                  <span>Distribute</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-container mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/images/avail.png" 
                alt="AVAIL Logo" 
                className="h-6 w-6 rounded-full"
              />
              <span className="text-gray-600">AVAIL Token Distribution</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/availproject/avail-token-airdrop" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                </svg>
              </a>
              <a 
                href="https://twitter.com/AvailProject" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
            </div>

            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} AVAIL Token Distribution. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
