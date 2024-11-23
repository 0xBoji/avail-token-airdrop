'use client';

import { useState, useEffect } from 'react';
import { useContractWrite, useAccount, Address } from 'wagmi';
import { parseAbiItem } from 'viem';
import * as XLSX from 'xlsx';
import TokenDistributorABI from '../abi/TokenDistributor.json';

interface Transfer {
  address: string;
  amount: string;
}

interface ConfirmationDetails {
  tokenAddress: string;
  tokenAmount: string;
  totalAmount: string;
  recipientCount: number;
}

const CONTRACT_ADDRESS = '0x...'; // Replace with your deployed contract address

export default function TokenDistributor() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [poolId, setPoolId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails>({
    tokenAddress: '',
    tokenAmount: '',
    totalAmount: '0',
    recipientCount: 0,
  });
  
  const { address, isConnected } = useAccount();

  const { writeAsync: write } = useContractWrite({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: TokenDistributorABI,
    functionName: 'add_address_amount_to_pool',
  });

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(sheet) as { Address: string; Amount: string }[];
      const formattedData = jsonData.map(row => ({
        address: row.Address,
        amount: row.Amount
      }));
      
      setTransfers(formattedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleAddRow = () => {
    setTransfers([...transfers, { address: '', amount: '' }]);
  };

  const handleUpdateTransfer = (index: number, field: keyof Transfer, value: string) => {
    const updatedTransfers = [...transfers];
    updatedTransfers[index][field] = value;
    setTransfers(updatedTransfers);
  };

  const handleConfirmationOpen = () => {
    if (!poolId || transfers.length === 0) return;

    const totalAmount = transfers.reduce((sum, transfer) => {
      return sum + (Number(transfer.amount) || 0);
    }, 0);

    setConfirmationDetails({
      tokenAddress: '',
      tokenAmount: '',
      totalAmount: totalAmount.toString(),
      recipientCount: transfers.length,
    });
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    if (!poolId || 
        transfers.length === 0 || 
        !address || 
        !confirmationDetails.tokenAddress ||
        !confirmationDetails.tokenAmount) return;
    
    setIsSubmitting(true);
    try {
      const addresses = transfers.map(t => t.address);
      const amounts = transfers.map(t => t.amount);
      
      if (write) {
        await write({
          args: [BigInt(poolId), addresses, amounts],
        });
      }
    } catch (error) {
      console.error('Error submitting transfers:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const handlePoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPoolId(value);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Please connect your wallet</h2>
        <p className="text-gray-600">Connect your wallet to use the token distributor</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Retroactive Distribution</h1>
          <p className="text-gray-600 mt-2">Distribute tokens to multiple addresses</p>
        </div>

        {/* Import Section */}
        <div className="mb-8">
          <button
            onClick={() => document.getElementById('excel-upload')?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 
              rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Import Excel
          </button>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelUpload}
          />
        </div>

        {/* Table */}
        <div className="mb-8">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((transfer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={transfer.address}
                        onChange={(e) => handleUpdateTransfer(index, 'address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                          focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="0x..."
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={transfer.amount}
                        onChange={(e) => handleUpdateTransfer(index, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                          focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Amount"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          const newTransfers = [...transfers];
                          newTransfers.splice(index, 1);
                          setTransfers(newTransfers);
                        }}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleAddRow}
            className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 
              hover:bg-gray-50 transition-colors duration-200"
          >
            + Add Row
          </button>
        </div>

        {/* Submit Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit for Transfer</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pool ID
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Enter pool ID (numbers only)"
                value={poolId}
                onChange={handlePoolIdChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                  focus:ring-blue-500 focus:border-transparent outline-none
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {poolId && !/^\d+$/.test(poolId) && (
                <p className="mt-1 text-sm text-red-600">
                  Pool ID must be a valid number
                </p>
              )}
            </div>
            <button
              onClick={handleConfirmationOpen}
              disabled={!poolId || !/^\d+$/.test(poolId) || transfers.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium 
                hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-300 
                disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Review Transfer
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full">
              <h3 className="text-xl font-bold mb-4">Confirm Transfer Details</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter token address (0x...)"
                    value={confirmationDetails.tokenAddress}
                    onChange={(e) => setConfirmationDetails({
                      ...confirmationDetails,
                      tokenAddress: e.target.value
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Amount to Distribute
                  </label>
                  <input
                    type="text"
                    placeholder="Enter total token amount"
                    value={confirmationDetails.tokenAmount}
                    onChange={(e) => setConfirmationDetails({
                      ...confirmationDetails,
                      tokenAmount: e.target.value
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                      focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Recipients:</span>
                    <span className="font-medium">{confirmationDetails.recipientCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount to Distribute:</span>
                    <span className="font-medium">{confirmationDetails.tokenAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount per Transaction:</span>
                    <span className="font-medium">{confirmationDetails.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pool ID:</span>
                    <span className="font-medium">{poolId}</span>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Please verify the token address and amount carefully before confirming. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                    text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !confirmationDetails.tokenAddress || !confirmationDetails.tokenAmount}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
                    hover:bg-blue-700 transition-colors duration-200 
                    disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 