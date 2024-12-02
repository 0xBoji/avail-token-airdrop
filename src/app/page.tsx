"use client"

import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenDistributorABI from '../abi/TokenDistributor.json';
import AvailTokenABI from '../abi/AvailToken.json';
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';

const AddTokenModal = dynamic(() => import('../components/AddTokenModal'), {
  loading: () => <p>Loading...</p>
});

const PoolList = dynamic(() => import('../components/PoolList'), {
  loading: () => <p>Loading...</p>
});

interface AddressAmount {
  address: string;
  amount: string;
}

const DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS || '0xdc11F523C329a2ca31247a266526e05354186934';
const AVAIL_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_AVAIL_TOKEN_ADDRESS || '0x421eEeF4f73c23B976a8AA82b5DD74999260adAc';
const ADMIN_ADDRESS = '0x0ce46bb78c522C4C007562269262224131990530';
const EXPLORER_URL = 'https://sepolia.arbiscan.io/tx/';

const setupEventListeners = (contract: ethers.Contract) => {
  contract.on("PoolCreated", (poolId, name, poolType, event) => {
    toast.success(
      <div>
        <p>Pool "{name}" created successfully with ID: {poolId.toString()}</p>
        <a 
          href={`${EXPLORER_URL}${event.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500 underline"
        >
          View on Explorer
        </a>
      </div>
    );
    console.log("Pool Created Event:", { 
      poolId: poolId.toString(), 
      name, 
      poolType: poolType.toString(), 
      event 
    });
  });

  contract.on("AddressesAdded", (poolId, totalAddresses, event) => {
    toast.success(
      <div>
        <p>Added {totalAddresses.toString()} addresses to pool {poolId.toString()}</p>
        <a 
          href={`${EXPLORER_URL}${event.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500 underline"
        >
          View on Explorer
        </a>
      </div>
    );
    console.log("Addresses Added Event:", { 
      poolId: poolId.toString(), 
      totalAddresses: totalAddresses.toString(), 
      event 
    });
  });

  contract.on("TokenAddedToPool", (poolId, token, amount, event) => {
    const formattedAmount = ethers.utils.formatEther(amount);
    toast.success(
      <div>
        <p>Added {formattedAmount} tokens to pool {poolId.toString()}</p>
        <a 
          href={`${EXPLORER_URL}${event.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500 underline"
        >
          View on Explorer
        </a>
      </div>
    );
    console.log("Token Added Event:", { 
      poolId: poolId.toString(), 
      token, 
      amount: formattedAmount, 
      event 
    });
  });

  contract.on("TokensDistributed", (poolId, event) => {
    toast.success(
      <div>
        <p>Tokens distributed successfully for pool {poolId.toString()}</p>
        <a 
          href={`${EXPLORER_URL}${event.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500 underline"
        >
          View on Explorer
        </a>
      </div>
    );
    console.log("Tokens Distributed Event:", { 
      poolId: poolId.toString(), 
      event 
    });
  });

  contract.on("TokenClaimed", (poolId, user, amount, event) => {
    const formattedAmount = ethers.utils.formatEther(amount);
    toast.success(
      <div>
        <p>{formattedAmount} tokens claimed from pool {poolId.toString()}</p>
        <a 
          href={`${EXPLORER_URL}${event.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500 underline"
        >
          View on Explorer
        </a>
      </div>
    );
    console.log("Token Claimed Event:", { 
      poolId: poolId.toString(), 
      user, 
      amount: formattedAmount, 
      event 
    });
  });

  return () => {
    contract.removeAllListeners();
  };
};

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
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

  const contractRef = useRef<ethers.Contract | null>(null);

  useEffect(() => {
    const checkAccount = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          const currentAccount = accounts[0]?.toLowerCase();
          setAccount(currentAccount);
          setIsAdmin(currentAccount === ADMIN_ADDRESS.toLowerCase());
        } catch (error) {
          console.error('Error checking account:', error);
        }
      }
    };

    checkAccount();

    const handleAccountsChanged = (accounts: string[]) => {
      const currentAccount = accounts[0]?.toLowerCase();
      setAccount(currentAccount);
      setIsAdmin(currentAccount === ADMIN_ADDRESS.toLowerCase());
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined' && DISTRIBUTOR_ADDRESS) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        DISTRIBUTOR_ADDRESS,
        TokenDistributorABI,
        provider
      );
      
      contractRef.current = contract;
      const cleanup = setupEventListeners(contract);

      return () => {
        cleanup();
        contractRef.current = null;
      };
    }
  }, []);

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('No data read from file');
        }

        // Set a reasonable size limit (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File is too large. Please use a file smaller than 5MB');
        }

        const workbook = XLSX.read(data, { 
          type: 'binary',
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data without headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: ''
        });
        
        // Process data directly from columns A and B
        const formattedData = jsonData
          .filter((row: any) => row[0] && row[1]) // Only take rows with both columns filled
          .map((row: any) => ({
            address: String(row[0]).trim(),
            amount: String(row[1]).trim()
          }));

        if (formattedData.length === 0) {
          throw new Error('No valid data found in Excel file');
        }

        // Clear memory
        reader.onload = null;
        setAddressAmounts(formattedData);
        alert('Excel file imported successfully!');
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert(`Error parsing Excel file: ${(error as Error).message}`);
      }
    };

    reader.onerror = () => {
      alert('Error reading file');
      reader.abort();
    };

    try {
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error starting file read:', error);
      alert('Error reading file');
    }
  }, []);

  const handleEditSave = useCallback((index: number) => {
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
  }, [editAddress, editAmount, addressAmounts]);

  const createPool = useCallback(async () => {
    try {
      if (!DISTRIBUTOR_ADDRESS) {
        throw new Error('Please configure NEXT_PUBLIC_DISTRIBUTOR_ADDRESS in your environment variables');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        DISTRIBUTOR_ADDRESS,
        TokenDistributorABI,
        signer
      );

      console.log('Creating pool with name:', poolName);
      console.log('Pool type:', poolType);
      
      let tx;
      if (poolType === 'auto') {
        tx = await contract.createAutoPool(poolName);
      } else {
        tx = await contract.createClaimPool(poolName);
      }

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Pool created successfully:', receipt);

      // Get the pool ID from the event
      const event = receipt.events?.find((e: { event: string }) => e.event === 'PoolCreated');
      if (event) {
        const poolId = event.args?.poolId.toString();
        console.log('New pool ID:', poolId);
        setPoolId(poolId);
      }
    } catch (error) {
      console.error('Error creating pool:', error);
      toast.error(`Failed to create pool: ${error.message || 'Unknown error'}`);
    }
  }, [poolName, poolType]);

  const addAddresses = useCallback(async () => {
    try {
      if (!DISTRIBUTOR_ADDRESS) {
        throw new Error('Distributor contract address not configured');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        DISTRIBUTOR_ADDRESS,
        TokenDistributorABI,
        signer
      );

      // Convert addresses and amounts from the table
      const addressList = addressAmounts.map(item => item.address);
      
      // Convert amounts to BigNumber
      const amountList = addressAmounts.map(item => {
        try {
          // Remove any commas, spaces, and validate the amount
          const cleanAmount = item.amount.replace(/[,\s]/g, '');
          if (!cleanAmount || isNaN(Number(cleanAmount))) {
            throw new Error(`Invalid amount format for address ${item.address}`);
          }
          // Convert to wei using parseUnits
          return ethers.utils.parseUnits(cleanAmount, 18).toString();
        } catch (error) {
          console.error('Error formatting amount:', error);
          throw new Error(`Invalid amount format for address ${item.address}: ${item.amount}`);
        }
      });

      console.log('Adding addresses to pool:', selectedPoolId);
      console.log('Addresses:', addressList);
      console.log('Amounts (in wei):', amountList);

      // Validate arrays are not empty
      if (addressList.length === 0 || amountList.length === 0) {
        throw new Error('No addresses or amounts to add');
      }

      // Validate arrays have same length
      if (addressList.length !== amountList.length) {
        throw new Error('Address and amount lists must have the same length');
      }

      // Convert amounts to BigNumber array for contract call
      const amountsBN = amountList.map(amount => ethers.BigNumber.from(amount));

      const tx = await contract.addAddressesToPool(selectedPoolId, addressList, amountsBN);
      toast.loading('Adding addresses...', { id: tx.hash });
      
      await tx.wait();
      console.log('Addresses added successfully');

      // Clear the address list after successful addition
      setAddressAmounts([]);
      setEditAddress('');
      setEditAmount('');
    } catch (error) {
      console.error('Error adding addresses:', error);
      toast.error(`Failed to add addresses: ${error.message || 'Unknown error'}`);
    }
  }, [selectedPoolId, addressAmounts]);

  const addTokenToPool = useCallback(async (amount: string) => {
    try {
      if (!DISTRIBUTOR_ADDRESS || !AVAIL_TOKEN_ADDRESS) {
        throw new Error('Contract addresses not configured');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // First check if addresses have been added to the pool
      const distributorContract = new ethers.Contract(
        DISTRIBUTOR_ADDRESS,
        TokenDistributorABI,
        signer
      );

      // Get pool info and validate
      const poolInfo = await distributorContract.getPoolInfo(poolId);
      console.log('Pool info:', poolInfo);

      if (!poolInfo || poolInfo.totalAmount.eq(0)) {
        throw new Error('Please add addresses to the pool first');
      }

      if (poolInfo.isTokenAdded) {
        throw new Error('Token has already been added to this pool');
      }

      const requiredAmount = poolInfo.totalAmount;
      console.log('Required amount:', ethers.utils.formatEther(requiredAmount));

      // Convert amount to wei
      const amountInWei = ethers.utils.parseEther(amount);
      console.log('Amount to add (in wei):', amountInWei.toString());

      // Validate amount
      if (amountInWei.lt(requiredAmount)) {
        throw new Error(`Insufficient amount. Required: ${ethers.utils.formatEther(requiredAmount)} AVAIL`);
      }

      // Check token balance
      const tokenContract = new ethers.Contract(
        AVAIL_TOKEN_ADDRESS,
        [
          'function balanceOf(address account) view returns (uint256)',
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      const balance = await tokenContract.balanceOf(userAddress);
      console.log('User token balance:', ethers.utils.formatEther(balance));

      if (balance.lt(amountInWei)) {
        throw new Error(`Insufficient token balance. You have ${ethers.utils.formatEther(balance)} AVAIL`);
      }

      // First approve the token transfer
      console.log('Approving tokens...');
      const approveTx = await tokenContract.approve(DISTRIBUTOR_ADDRESS, amountInWei);
      console.log('Approval transaction sent:', approveTx.hash);
      const approvalReceipt = await approveTx.wait();
      
      if (approvalReceipt.status === 0) {
        throw new Error('Token approval failed');
      }
      console.log('Tokens approved');

      // Verify allowance after approval
      const allowance = await tokenContract.allowance(userAddress, DISTRIBUTOR_ADDRESS);
      console.log('Allowance after approval:', ethers.utils.formatEther(allowance));

      if (allowance.lt(amountInWei)) {
        throw new Error('Approval failed - allowance not set correctly');
      }

      // Add a small delay after approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Debug the contract state before adding token
      try {
        const debug = await distributorContract.debugDistribute(poolId, 0);
        console.log('Debug info:', debug);
      } catch (error) {
        console.log('Debug info not available:', error);
      }

      // Then add token to pool with increased gas limit
      console.log('Adding token to pool...');
      console.log('Parameters:', {
        poolId: poolId.toString(),
        token: AVAIL_TOKEN_ADDRESS,
        amount: amountInWei.toString()
      });

      const addTokenTx = await distributorContract.addTokenToPool(
        poolId, 
        AVAIL_TOKEN_ADDRESS, 
        amountInWei,
        {
          gasLimit: 500000
        }
      );
      
      toast.loading(
        <div>
          <p>Adding token to pool...</p>
          <a 
            href={`${EXPLORER_URL}${addTokenTx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-500 underline"
          >
            View on Explorer
          </a>
        </div>,
        { id: addTokenTx.hash }
      );
      
      await addTokenTx.wait();
      
      // Verify the token was actually added
      const updatedPoolInfo = await distributorContract.getPoolInfo(poolId);
      if (!updatedPoolInfo.isTokenAdded) {
        throw new Error('Token addition failed - Pool state not updated');
      }

      console.log('Token added to pool successfully, receipt:', receipt);
      
      setIsTokenAdded(true);
      setIsAddTokenModalOpen(false);
    } catch (error: any) {
      console.error('Error adding token to pool:', error);
      const errorMessage = error.message || 'Unknown error';
      const txHash = error.transaction?.hash;
      
      toast.error(
        <div>
          <p>Failed to add token: {errorMessage}</p>
          {txHash && (
            <a 
              href={`${EXPLORER_URL}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-500 underline"
            >
              View on Explorer
            </a>
          )}
        </div>
      );
    }
  }, [poolId]);

  const handleDistribution = useCallback(async () => {
    try {
      if (!DISTRIBUTOR_ADDRESS) {
        throw new Error('Distributor contract address not configured');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        DISTRIBUTOR_ADDRESS,
        TokenDistributorABI,
        signer
      );

      // First check pool info
      console.log('Checking pool info for pool:', poolId);
      const poolInfo = await contract.getPoolInfo(poolId);
      
      if (!poolInfo.isTokenAdded) {
        throw new Error('Token must be added to the pool before distribution');
      }

      if (poolInfo.isDistributed) {
        throw new Error('Pool has already been distributed');
      }

      const batchSize = 100; // Add batch size parameter

      if (poolType === 'auto') {
        console.log('Distributing tokens for pool:', poolId);
        const tx = await contract.distributeToAll(
          poolId,
          batchSize // Add batch size
        );
        toast.loading('Distributing tokens...', { id: tx.hash });
        
        await tx.wait();
        console.log('Distribution successful:', receipt);
        alert('Tokens distributed successfully!');
      } else {
        console.log('Claiming tokens for pool:', poolId);
        const tx = await contract.claim(poolId);
        console.log('Claim transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('Claim successful:', receipt);
        alert('Tokens claimed successfully!');
      }
    } catch (error: any) {
      console.error('Error with distribution:', error);
      toast.error(`Distribution failed: ${error.message || 'Unknown error'}`);
    }
  }, [poolId, poolType]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center space-y-8 p-8">
            {/* Logo and Title */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                GFI Airdrop
              </h1>
              <p className="text-lg text-gray-600">
                Admin Dashboard
              </p>
            </div>

            {/* Connection Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-full">
                  <svg 
                    className="w-8 h-8 text-gray-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7m-6 4h4" 
                    />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Admin Access Required
                  </h2>
                  <p className="text-sm text-gray-600">
                    Please connect with the admin wallet to continue
                  </p>
                </div>
              </div>

              {/* Connect Button */}
              <div className="flex justify-center">
                <ConnectButton />
              </div>

              {/* Error Message */}
              {account && account !== ADMIN_ADDRESS.toLowerCase() && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-3">
                    <svg 
                      className="w-5 h-5 text-red-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <p className="text-sm text-red-600">
                      Please connect with the admin wallet address
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Address Display */}
            <div className="text-sm text-gray-500">
              Admin Address: 
              <span className="font-mono ml-2 text-gray-600">
                {ADMIN_ADDRESS}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-black">
                GFI Airdrop
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
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
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
                <button 
                  onClick={addAddresses}
                  className="btn btn-primary"
                  disabled={addressAmounts.length === 0}  // Only check for addresses
                  title={addressAmounts.length === 0 ? "Please add addresses first" : ""}
                >
                  Add Addresses to Pool
                </button>
                {selectedPoolId && (
                  <button 
                    onClick={() => setIsAddTokenModalOpen(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Token
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Add Token Modal */}
          <AddTokenModal
            isOpen={isAddTokenModalOpen}
            closeModal={() => setIsAddTokenModalOpen(false)}
            poolId={selectedPoolId}
            onAddToken={addTokenToPool}
          />

          {/* Distribution/Claim Card */}
          {poolType === 'auto' && (
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="mt-8">
            <PoolList />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-auto py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">GFI Airdrop</span>
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
              © {new Date().getFullYear()} GFI Airdrop. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
