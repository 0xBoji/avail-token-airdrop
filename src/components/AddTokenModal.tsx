import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import TokenDistributorABI from '../abi/TokenDistributor.json'

const AVAIL_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_AVAIL_TOKEN_ADDRESS || '0x421eEeF4f73c23B976a8AA82b5DD74999260adAc';
const DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS || '0x61a4bb5Adb395EE226BBCCAF5a393E431F84703C';
const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

interface AddTokenModalProps {
  isOpen: boolean;
  closeModal: () => void;
  poolId: string;
  onAddToken: (amount: string) => void;
}

export default function AddTokenModal({
  isOpen,
  closeModal,
  poolId,
  onAddToken
}: AddTokenModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [requiredAmount, setRequiredAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Get pool info when modal opens
  useEffect(() => {
    async function getPoolInfo() {
      if (poolId && isOpen) {
        try {
          // Use JsonRpcProvider instead of Web3Provider
          const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
          const contract = new ethers.Contract(
            DISTRIBUTOR_ADDRESS,
            TokenDistributorABI,
            provider
          );

          console.log('Getting pool info for pool:', poolId);
          const poolInfo = await contract.getPoolInfo(poolId);
          const required = ethers.utils.formatEther(poolInfo.totalAmount);
          console.log('Required amount:', required);
          
          setRequiredAmount(required);
          setAmount(required); // Set initial amount to required amount
        } catch (error) {
          console.error('Error getting pool info:', error);
        }
      }
    }
    getPoolInfo();
  }, [poolId, isOpen]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (Number(value) < Number(requiredAmount)) {
      setError(`Amount must be at least ${requiredAmount}`);
    } else {
      setError('');
    }
  };

  const handleSubmit = () => {
    if (!amount) {
      setError('Amount is required');
      return;
    }

    try {
      // Parse amount to check if it's a valid number
      const amountNum = ethers.utils.parseEther(amount);
      const requiredNum = ethers.utils.parseEther(requiredAmount);

      if (amountNum.lt(requiredNum)) {
        setError(`Amount must be at least ${requiredAmount} AVAIL`);
        return;
      }

      onAddToken(amount);
      closeModal();
    } catch (error) {
      setError('Invalid amount format');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2"
                >
                  <span>Add AVAIL Token to Pool</span>
                  <span className="text-sm font-normal text-gray-500">
                    (Pool ID: {poolId})
                  </span>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {/* Token Address (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Address
                    </label>
                    <input
                      type="text"
                      value={AVAIL_TOKEN_ADDRESS}
                      disabled
                      className="input bg-gray-50"
                    />
                  </div>

                  {/* Required Amount (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Required Amount
                    </label>
                    <input
                      type="text"
                      value={requiredAmount}
                      disabled
                      className="input bg-gray-50"
                    />
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Add
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="input"
                      min={requiredAmount}
                      step="0.000000000000000001"
                    />
                    {error && (
                      <p className="mt-1 text-sm text-red-600">
                        {error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!!error || !amount}
                  >
                    Add Token
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 