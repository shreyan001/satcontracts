'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, CheckCircle, Clock, Wallet, FileText, ArrowRight, RefreshCw, Shield, Image, Bitcoin, Users, Circle } from 'lucide-react'
import { useWalletClient, useAccount, useChainId } from 'wagmi'
import { publicClient } from '@/walletConnect/siwe'
import { parseEther, formatEther } from 'viem'
import { ethers } from 'ethers'

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

interface EscrowOrder {
  orderId: string
  partyA: string
  partyB: string
  nftContract: string
  tokenId: string
  cbtcAmount: string
  status: 'Created' | 'CBTCDeposited' | 'NFTDeposited' | 'Completed' | 'Cancelled'
  createdAt: number
}

interface DeployedContract {
  id: string
  name: string
  contractAddress: string
  abi: any[]
  bytecode: string
  contractType: string
  partyA: string
  partyB?: string
  deployedAt: string
  transactionHash?: string
  networkId?: string
  description?: string
  partyASignatureStatus?: boolean
  partyBSignatureStatus?: boolean
  partyAAddress?: string
  partyBAddress?: string
  partyASignature?: string
  partyBSignature?: string
}

interface TransactionalHandlingProps {
  contract: DeployedContract
  isPartyA: boolean
  isPartyB: boolean
  userAddress?: string
}

export function TransactionalHandling({ contract, isPartyA, isPartyB, userAddress }: TransactionalHandlingProps) {
  const { data: walletClient } = useWalletClient()
  const { address: walletAddress, isConnected } = useAccount()
  const chainId = useChainId()
  
  // Party A States (Order Creation)
  const [nftContractAddress, setNftContractAddress] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [expectedCBTCAmount, setExpectedCBTCAmount] = useState('')
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  
  // Party B States (CBTC Deposit)
  const [orderIdToJoin, setOrderIdToJoin] = useState('')
  const [cbtcDepositAmount, setCbtcDepositAmount] = useState('')
  const [isDepositingCBTC, setIsDepositingCBTC] = useState(false)
  
  // General States
  const [escrowOrders, setEscrowOrders] = useState<EscrowOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<EscrowOrder | null>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('party-a')
  
  // Contract interaction state
  const [contractInstance, setContractInstance] = useState<ethers.Contract | null>(null)
  const [escrowStatus, setEscrowStatus] = useState({
    partyADeposited: false,
    partyBDeposited: false,
    executed: false
  })

  const getOrderStatus = (partyADeposited: boolean, partyBDeposited: boolean, executed: boolean): EscrowOrder['status'] => {
    if (executed) {
      return 'Completed'
    } else if (partyADeposited && partyBDeposited) {
      return 'NFTDeposited' // Both parties have deposited, ready for execution
    } else if (partyADeposited) {
      return 'CBTCDeposited'
    } else {
      return 'Created'
    }
  }

  const initializeContract = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const contractInstance = new ethers.Contract(contract.contractAddress, contract.abi, signer)
        setContractInstance(contractInstance)
      }
    } catch (err) {
      console.error('Failed to initialize contract:', err)
      setError('Failed to connect to contract')
    }
  }, [contract.contractAddress, contract.abi])

  const loadEscrowOrders = useCallback(async () => {
    if (!contract.contractAddress || !contract.abi) return
    
    setIsLoadingOrders(true)
    try {
      if (contractInstance) {
        // Read escrow orders from the contract
        try {
          // Get the next order ID to know how many orders exist
          const nextOrderId = await contractInstance.nextOrderId()
          const orders: EscrowOrder[] = []
          
          // Load all existing orders
          for (let i = 0; i < nextOrderId; i++) {
            try {
              const escrowOrder = await contractInstance.escrowOrders(i)
              
              if (escrowOrder && escrowOrder.partyA !== '0x0000000000000000000000000000000000000000') {
                orders.push({
                  orderId: i.toString(),
                  partyA: escrowOrder.partyA,
                  partyB: escrowOrder.partyB,
                  nftContract: escrowOrder.nftContract,
                  tokenId: escrowOrder.nftTokenId.toString(),
                  cbtcAmount: ethers.formatEther(escrowOrder.cbtcAmount), // CBTC uses 18 decimals like ETH
                  status: getOrderStatus(escrowOrder.partyADeposited, escrowOrder.partyBDeposited, escrowOrder.executed),
                  createdAt: Number(escrowOrder.createdAt) * 1000 // Convert to milliseconds
                })
              }
            } catch (orderErr) {
              console.log(`Order ${i} not found or error:`, orderErr)
            }
          }
          
          setEscrowOrders(orders)
        } catch (err) {
          console.error('Error loading orders:', err)
        }
      }
    } catch (err) {
      console.error('Failed to load escrow orders:', err)
      setError('Failed to load escrow orders')
    } finally {
      setIsLoadingOrders(false)
    }
  }, [contractInstance, contract.contractAddress, contract.abi])

  // Load escrow orders on component mount
  useEffect(() => {
    if (contract.contractAddress && isConnected) {
      initializeContract()
      loadEscrowOrders()
    }
  }, [contract.contractAddress, isConnected, initializeContract, loadEscrowOrders])

  // Set up event listeners for real-time updates
  useEffect(() => {
    if (contractInstance) {
      const setupEventListeners = () => {
        try {
          // Listen for EscrowOrderCreated events
          contractInstance.on('EscrowOrderCreated', (orderId, partyA, partyB, nftContract, nftTokenId, cbtcAmount) => {
            console.log('Escrow order created:', { orderId, partyA, partyB, nftContract, nftTokenId, cbtcAmount })
            loadEscrowOrders() // Refresh orders
          })

          // Listen for PartyADeposit events (CBTC deposits)
          contractInstance.on('PartyADeposit', (orderId, partyA, amount) => {
            console.log('Party A deposited:', { orderId, partyA, amount })
            loadEscrowOrders() // Refresh orders
          })

          // Listen for EscrowExecuted events
          contractInstance.on('EscrowExecuted', (orderId) => {
            console.log('Escrow executed:', { orderId })
            loadEscrowOrders() // Refresh orders
          })

          // Listen for EscrowCancelled events
          contractInstance.on('EscrowCancelled', (orderId) => {
            console.log('Escrow cancelled:', { orderId })
            loadEscrowOrders() // Refresh orders
          })
        } catch (err) {
          console.log('Event listeners not available for this contract')
        }
      }

      setupEventListeners()

      // Cleanup event listeners on unmount
      return () => {
        try {
          contractInstance.removeAllListeners('EscrowOrderCreated')
          contractInstance.removeAllListeners('PartyADeposit')
          contractInstance.removeAllListeners('EscrowExecuted')
          contractInstance.removeAllListeners('EscrowCancelled')
        } catch (err) {
          console.log('Error removing event listeners')
        }
      }
    }
  }, [contractInstance])

  const createEscrowOrder = async () => {
    if (!walletClient || !walletAddress || !contract.contractAddress) {
      setError('Wallet not connected or contract not available')
      return
    }

    if (!nftContractAddress || !tokenId || !expectedCBTCAmount) {
      setError('Please fill in all required fields')
      return
    }

    // Validate NFT contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(nftContractAddress)) {
      setError('Invalid NFT contract address. Must be a valid 40-character hex address starting with 0x')
      return
    }

    // Validate token ID is a valid number
    if (!/^\d+$/.test(tokenId)) {
      setError('Token ID must be a valid number')
      return
    }

    // Validate CBTC amount is a valid number
    if (isNaN(parseFloat(expectedCBTCAmount)) || parseFloat(expectedCBTCAmount) <= 0) {
      setError('Expected CBTC amount must be a valid positive number')
      return
    }

    setIsCreatingOrder(true)
    setError('')
    
    try {
      // Convert CBTC amount to wei (assuming 18 decimals for CBTC)
      const cbtcAmountWei = parseEther(expectedCBTCAmount)
      
      console.log('=== Creating Escrow Order ====')
      console.log('Contract Address:', contract.contractAddress)
      console.log('Wallet Address:', walletAddress)
      console.log('NFT Contract:', nftContractAddress)
      console.log('Token ID:', tokenId)
      console.log('CBTC Amount (original):', expectedCBTCAmount)
      console.log('CBTC Amount (wei):', cbtcAmountWei.toString())
      
      const contractArgs = [
        "0xB8a2ef8c4b4517311Ad8c8801f8abF853862e7b1" as `0x${string}`, // _partyB - from deployed contracts
        nftContractAddress as `0x${string}`, // _nftContract
        BigInt(tokenId), // _nftTokenId
        cbtcAmountWei // _cbtcAmount
      ]
      
      console.log('Contract Arguments:', contractArgs)
      
      // Call the createEscrowOrder function on the contract
      const hash = await walletClient.writeContract({
        address: contract.contractAddress as `0x${string}`,
        abi: contract.abi,
        functionName: 'createEscrowOrder',
        args: contractArgs,
        account: walletAddress,
        chain: undefined
      })

      console.log('Transaction Hash:', hash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      console.log('Transaction Receipt:', receipt)
      console.log('Transaction Status:', receipt.status)
      console.log('Gas Used:', receipt.gasUsed?.toString())
      console.log('Block Number:', receipt.blockNumber?.toString())
      
      if (receipt.status === 'success') {
        console.log('✅ Transaction successful!')
        setSuccess('Escrow order created successfully!')
        // Clear form
        setNftContractAddress('')
        setTokenId('')
        setExpectedCBTCAmount('')
        // Reload orders
        await loadEscrowOrders()
      } else {
        console.log('❌ Transaction failed with status:', receipt.status)
        setError('Transaction failed - check console for details')
      }
    } catch (err) {
      console.log('=== Transaction Error ====')
      console.error('Error object:', err)
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error')
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      
      // Log additional error details if available
      if (err && typeof err === 'object') {
        console.error('Error details:', JSON.stringify(err, null, 2))
      }
      
      setError(err instanceof Error ? err.message : 'Failed to create escrow order')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const depositCBTC = async () => {
    if (!walletClient || !walletAddress || !contract.contractAddress) {
      setError('Wallet not connected or contract not available')
      return
    }

    if (!orderIdToJoin || !cbtcDepositAmount) {
      setError('Please fill in all required fields')
      return
    }

    setIsDepositingCBTC(true)
    setError('')
    
    try {
      const cbtcAmountWei = parseEther(cbtcDepositAmount)
      
      const hash = await walletClient.writeContract({
        address: contract.contractAddress as `0x${string}`,
        abi: contract.abi,
        functionName: 'depositCBTCByPartyB',
        args: [BigInt(orderIdToJoin)],
        value: cbtcAmountWei,
        account: walletAddress,
        chain: undefined
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'success') {
        setSuccess('CBTC deposited successfully!')
        setOrderIdToJoin('')
        setCbtcDepositAmount('')
        await loadEscrowOrders()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deposit CBTC')
    } finally {
      setIsDepositingCBTC(false)
    }
  }

  const depositNFT = async () => {
    if (!contractInstance) {
      setError('Contract not initialized')
      return
    }
    
    try {
      setIsCreatingOrder(true)
      setError('')
      
      // This would call the contract's depositNFTByPartyA function
      // First, Party A needs to approve the NFT transfer
      // Then call the deposit function
      
      console.log('Depositing NFT for Party A')
      // Implementation would go here
      
      await loadEscrowOrders()
      
    } catch (err: any) {
      console.error('Failed to deposit NFT:', err)
      setError(err.message || 'Failed to deposit NFT')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Created': return 'bg-yellow-500'
      case 'CBTCDeposited': return 'bg-blue-500'
      case 'NFTDeposited': return 'bg-purple-500'
      case 'Completed': return 'bg-green-500'
      case 'Cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Created': return <Clock className="w-4 h-4" />
      case 'CBTCDeposited': return <Wallet className="w-4 h-4" />
      case 'NFTDeposited': return <FileText className="w-4 h-4" />
      case 'Completed': return <CheckCircle className="w-4 h-4" />
      case 'Cancelled': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-900 border border-red-700 p-4 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-red-200">{error}</span>
          <button 
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-green-200">{success}</span>
          </div>
        </div>
      )}

      {/* Enhanced Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Party A Section */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Image className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Party A</h3>
            <p className="text-gray-400 text-sm mb-4">NFT Depositor</p>
            
            {isPartyA ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="nftContract" className="text-white text-sm">NFT Contract</Label>
                    <Input
                      id="nftContract"
                      value={nftContractAddress}
                      onChange={(e) => setNftContractAddress(e.target.value)}
                      placeholder="0x..."
                      className="bg-gray-800 border-gray-600 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tokenId" className="text-white text-sm">Token ID</Label>
                    <Input
                      id="tokenId"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                      placeholder="1"
                      className="bg-gray-800 border-gray-600 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cbtcAmount" className="text-white text-sm">Expected CBTC</Label>
                    <Input
                      id="cbtcAmount"
                      value={expectedCBTCAmount}
                      onChange={(e) => setExpectedCBTCAmount(e.target.value)}
                      placeholder="0.001"
                      className="bg-gray-800 border-gray-600 text-white text-sm"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={createEscrowOrder}
                  disabled={isCreatingOrder || !isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  {isCreatingOrder ? 'Creating...' : 'Create Order'}
                </Button>
                
                {escrowOrders.length > 0 && (
                  <Button 
                    onClick={depositNFT}
                    disabled={isCreatingOrder || !isConnected}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    {isCreatingOrder ? 'Depositing...' : 'Deposit NFT'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Circle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 text-sm">Waiting for Party A</span>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <p className="text-white text-sm">Party A will create order</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Escrow Status Center */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col justify-center">
          <div className="text-center">
            <div className="bg-[#FFC700] p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Escrow Status</h3>
            <p className="text-gray-400 text-sm mb-4">Smart Contract Secured</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Party A Order:</span>
                <span className={escrowOrders.length > 0 ? "text-green-500" : "text-yellow-500"}>
                  {escrowOrders.length > 0 ? 'Created' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">NFT Deposit:</span>
                <span className={escrowStatus.partyADeposited ? "text-green-500" : "text-yellow-500"}>
                  {escrowStatus.partyADeposited ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">CBTC Deposit:</span>
                <span className={escrowStatus.partyBDeposited ? "text-green-500" : "text-yellow-500"}>
                  {escrowStatus.partyBDeposited ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Execution:</span>
                <span className={escrowStatus.executed ? "text-green-500" : "text-gray-500"}>
                  {escrowStatus.executed ? 'Completed' : 'Waiting'}
                </span>
              </div>
            </div>
            
            {escrowOrders.length > 0 && (
              <div className="mt-4 bg-gray-800 p-3 rounded">
                <p className="text-xs text-gray-400 mb-1">Active Order</p>
                <p className="text-white text-sm font-mono">#{escrowOrders[0]?.orderId || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Party B Section */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="bg-green-600 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bitcoin className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Party B</h3>
            <p className="text-gray-400 text-sm mb-4">CBTC Depositor</p>
            
            {isPartyB ? (
              escrowOrders.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-gray-800 p-3 rounded">
                    <p className="text-xs text-gray-400 mb-1">Required Amount</p>
                    <p className="text-white font-mono text-sm">{escrowOrders[0]?.cbtcAmount || '0'} CBTC</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount" className="text-white text-sm">CBTC Amount</Label>
                    <Input
                      id="depositAmount"
                      value={cbtcDepositAmount}
                      onChange={(e) => setCbtcDepositAmount(e.target.value)}
                      placeholder={escrowOrders[0]?.cbtcAmount || '0.001'}
                      className="bg-gray-800 border-gray-600 text-white text-sm"
                    />
                  </div>
                  
                  <Button 
                    onClick={depositCBTC}
                    disabled={isDepositingCBTC || !isConnected || escrowStatus.partyBDeposited}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    {isDepositingCBTC ? 'Depositing...' : escrowStatus.partyBDeposited ? 'Deposited' : 'Deposit CBTC'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500 text-sm">Waiting for Order</span>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <p className="text-white text-sm">Party A must create order first</p>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Circle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 text-sm">Waiting for Party B</span>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400 mb-1">Required Deposit</p>
                  <p className="text-white text-sm">{escrowOrders[0]?.cbtcAmount || 'TBD'} CBTC</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Transaction History */}
      {escrowOrders.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-[#FFC700]" />
              <span>Transaction History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escrowOrders.map((order) => (
                <div key={order.orderId} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-white text-sm">Order #{order.orderId}</span>
                    <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">NFT Contract:</p>
                      <p className="text-white font-mono">{order.nftContract.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Token ID:</p>
                      <p className="text-white">{order.tokenId}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">CBTC Amount:</p>
                      <p className="text-white">{order.cbtcAmount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Created:</p>
                      <p className="text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  )
}

export default TransactionalHandling