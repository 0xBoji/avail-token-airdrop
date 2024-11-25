'use client';

import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { type Address } from 'viem';
import * as XLSX from 'xlsx';
import TokenDistributorABI from '../abi/TokenDistributor.json';
import { toast } from 'sonner';

interface AddressAmount {
  address: Address;
  amount: string;
}

export function TokenDistributor() {
  const { address } = useAccount();
  const [addressAmounts, setAddressAmounts] = useState<AddressAmount[]>([]);
  const [poolId, setPoolId] = useState<string>('');

  const { writeContract, isPending, data: hash } = useWriteContract();

  const handleAddAddresses = async () => {
    if (!poolId || addressAmounts.length === 0) return;

    try {
      const addresses = addressAmounts.map(item => item.address);
      const amounts = addressAmounts.map(item => BigInt(item.amount));

      await writeContract({
        abi: TokenDistributorABI,
        address: process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS as `0x${string}`,
        functionName: 'addAddressesToPool',
        args: [BigInt(poolId), addresses, amounts],
      });

      toast.success('Transaction submitted');
    } catch (error) {
      console.error('Error adding addresses:', error);
      toast.error('Failed to add addresses');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: true,
          defval: ''
        });
        
        const formattedData = jsonData
          .filter((row: any) => row[0] && row[1])
          .map((row: any) => ({
            address: row[0].toString().trim() as Address,
            amount: row[1].toString().trim()
          }));

        setAddressAmounts(formattedData);
        toast.success('Excel file imported successfully');
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Pool ID</label>
        <input
          type="number"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Upload Excel</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="mt-1 block w-full"
        />
      </div>

      <button
        onClick={handleAddAddresses}
        disabled={isPending || !poolId || addressAmounts.length === 0}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Adding...' : 'Add Addresses'}
      </button>

      {addressAmounts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium">Uploaded Addresses</h3>
          <ul className="mt-2 space-y-2">
            {addressAmounts.map((item, index) => (
              <li key={index} className="text-sm">
                {item.address}: {item.amount}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 