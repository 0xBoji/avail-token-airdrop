"use client"
import { useContractRead } from "wagmi"
import { counterAbi } from "@/constants/abi"
import { counterAddress } from "@/constants"

export function ReadContract() {
  const { data, isLoading, isError } = useContractRead({
    address: counterAddress,
    abi: counterAbi,
    functionName: 'number',
  })

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error fetching number</div>

  return (
    <div>
      <div className="text-sm font-medium text-gray-500">Current number:</div>
      <div className="mt-1 text-3xl font-semibold">{data?.toString()}</div>
    </div>
  )
}
