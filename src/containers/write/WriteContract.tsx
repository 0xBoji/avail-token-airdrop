"use client"
import * as React from "react"
import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWriteContract, useWatchContractEvent } from 'wagmi'
import { toast } from "sonner"
import { Hash } from 'viem'

import { counterAbi } from "@/constants/abi"

interface WriteContractProps {
  onDistribute: (poolId: string) => Promise<void>;
}

export function WriteContract({ onDistribute }: WriteContractProps) {
  const { writeContract, isPending, data: hash } = useWriteContract()

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const poolId = formData.get("value") as string
    
    try {
      await onDistribute(poolId);
    } catch (error) {
      toast.error("Distribution Failed")
      console.error(error)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input name="value" placeholder="Enter Pool ID" required />
        <Button disabled={isPending} type="submit">
          {isPending ? "Distributing..." : "Distribute Tokens"}
        </Button>
      </div>
    </form>
  )
}
