"use client"
import * as React from "react"
import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWriteContract, useWatchContractEvent } from 'wagmi'
import { toast } from "sonner"
import { Hash } from 'viem'

import { counterAbi } from "@/constants/abi"

export function WriteContract() {
  const { writeContract, isPending, data: hash } = useWriteContract()

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const tokenId = formData.get("value") as string
    console.log(tokenId)
    
    try {
      await writeContract({
        address: "0x3e9C748E9DBB864Ee4dE65FA16343Cde878DF7D0" as `0x${string}`,
        abi: counterAbi,
        functionName: "setNumber",
        args: [BigInt(tokenId)],
      })
      toast.success("Transaction Submitted")
    } catch (error) {
      toast.error("Transaction Failed")
      console.error(error)
    }
  }

  // Watch for contract events
  useWatchContractEvent({
    address: "0x3e9C748E9DBB864Ee4dE65FA16343Cde878DF7D0" as `0x${string}`,
    abi: counterAbi,
    eventName: 'NumberSet',
    onLogs(logs) {
      toast.success("Number Set Successfully")
    },
  })

  return (
    <form onSubmit={submit}>
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input name="value" placeholder="5" required />
        <Button disabled={isPending} type="submit">
          {isPending ? "Confirming..." : "Set Number"}
        </Button>
      </div>
    </form>
  )
}
