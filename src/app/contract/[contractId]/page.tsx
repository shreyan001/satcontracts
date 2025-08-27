'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, ExternalLink, Check, ArrowLeft, Users, Shield, Clock, CheckCircle, Circle, Bitcoin, Image, Headphones, FileText, Signature, Wallet, Info, ChevronDown, AlertTriangle, ScrollText } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useSignMessage } from 'wagmi'
import ConnectButton from '@/components/ui/walletButton'
import NextImage from 'next/image'
import TransactionalHandling from '@/components/ui/TransactionalHandling'

interface DeployedContract {
  id: string;
  name: string;
  contractAddress: string;
  abi: any[];
  bytecode: string;
  contractType: string;
  partyA: string;
  partyB?: string;
  deployedAt: string;
  transactionHash?: string;
  networkId?: string;
  description?: string;
  partyASignatureStatus?: boolean;
  partyBSignatureStatus?: boolean;
  partyAAddress?: string;
  partyBAddress?: string;
  partyASignature?: string;
  partyBSignature?: string;
}

export default function ContractPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.contractId as string
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  
  const [contract, setContract] = useState<DeployedContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showBytecode, setShowBytecode] = useState(false)
  const [showContractDetails, setShowContractDetails] = useState(false)
  const [showContractInfo, setShowContractInfo] = useState(false)
  const [isSigningA, setIsSigningA] = useState(false)
  const [isSigningB, setIsSigningB] = useState(false)

  useEffect(() => {
    fetchContractData()
  }, [contractId])

  const fetchContractData = async () => {
    try {
      setLoading(true)
      setError(null) // Clear previous errors
      const response = await fetch(`/api/contracts?id=${contractId}`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Contract not found: ${response.status} ${errorText}`)
      }
      const contractData = await response.json()
      setContract(contractData)
    } catch (err) {
      console.error('Error fetching contract data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contract')
    } finally {
      setLoading(false)
    }
  }

  const updateSignatureStatus = async (party: 'A' | 'B', signature: string) => {
    try {
      const response = await fetch(`/api/contracts?id=${contractId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          party,
          address,
          signature,
          signatureStatus: true
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('PATCH request failed:', response.status, errorText)
        throw new Error(`Failed to update signature status: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      if (!result.success || !result.contract) {
        throw new Error('Invalid response format from server')
      }
      setContract(result.contract)
    } catch (error) {
      console.error('Error updating signature status:', error)
      throw error
    }
  }

  const handleSignContract = async (party: 'A' | 'B') => {
    if (!address || !contract) {
      console.error('Missing address or contract data')
      return
    }
    
    try {
      if (party === 'A') setIsSigningA(true)
      else setIsSigningB(true)
      
      // Create message to sign
      const message = `I, ${address}, hereby agree to the terms and conditions of the electronic contract "${contract.name}" (ID: ${contract.id}) as Party ${party}. This signature confirms my commitment to fulfill all obligations outlined in this agreement.\n\nContract Address: ${contract.contractAddress}\nTimestamp: ${new Date().toISOString()}\nChain ID: 5115 (Citrea Testnet)`
      
      console.log(`Signing message for Party ${party}:`, message)
      
      // Sign the message
      const signature = await signMessageAsync({ message, account: address })
      
      console.log(`Signature generated for Party ${party}:`, signature)
      
      // Update backend with signature
      await updateSignatureStatus(party, signature)
      
      console.log(`Party ${party} signed successfully`)
    } catch (error) {
      console.error(`Error signing contract for Party ${party}:`, error)
      
      // More user-friendly error handling
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Check for specific error types
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Signature was cancelled by user'
      } else if (errorMessage.includes('Failed to update signature status')) {
        errorMessage = 'Signature created but failed to save. Please try again.'
      }
      
      alert(`Failed to sign contract: ${errorMessage}`)
    } finally {
      setIsSigningA(false)
      setIsSigningB(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47615] mx-auto mb-4"></div>
          <p>Loading contract...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/')} className="bg-[#d47615] hover:bg-[#d47615]/80 text-black font-mono">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Contract Not Found</h1>
          <p className="text-gray-400 mb-4">The requested contract could not be found.</p>
          <Button onClick={() => router.push('/')} className="bg-[#d47615] hover:bg-[#d47615]/80 text-black font-mono">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const isPartyA = address?.toLowerCase() === contract.partyAAddress?.toLowerCase()
  const isPartyB = address?.toLowerCase() === contract.partyBAddress?.toLowerCase() || (!contract.partyB && address && !isPartyA)
  const partyASigned = contract.partyASignatureStatus || false
  const partyBSigned = contract.partyBSignatureStatus || false
  const bothPartiesSigned = partyASigned && partyBSigned

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-700" />
              <div className="flex items-center space-x-3">
                <NextImage
                  src="/logo.png"
                  alt="SatContracts"
                  width={32}
                  height={32}
                  className="rounded"
                />
                <span className="text-xl font-bold text-[#d47615]">SatContracts</span>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Contract Header */}
        <div className="mb-8 bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="bg-[#d47615] p-3 rounded-lg">
                <FileText className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{contract.name}</h1>
                <p className="text-gray-400">{contract.contractType} • ID: {contract.id}</p>
              </div>
            </div>
            <button
              onClick={() => setShowContractInfo(!showContractInfo)}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Info className="h-4 w-4" />
              <span>Contract Details</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showContractInfo ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showContractInfo && (
            <div className="border-t border-gray-700 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Contract Address</p>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-800 px-2 py-1 rounded">{contract.contractAddress}</code>
                    <button
                      onClick={() => copyToClipboard(contract.contractAddress)}
                      className="text-gray-400 hover:text-white"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Deployed</p>
                  <p className="text-sm">{new Date(contract.deployedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Party A Address</p>
                  <code className="text-sm bg-gray-800 px-2 py-1 rounded block">{contract.partyAAddress || contract.partyA}</code>
                </div>
                {contract.partyBAddress && (
                  <div>
                    <p className="text-sm text-gray-400">Party B Address</p>
                    <code className="text-sm bg-gray-800 px-2 py-1 rounded block">{contract.partyBAddress}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Electronic Contract Agreement - Only show before both parties sign */}
        {!bothPartiesSigned && (
          <div className="mb-8 bg-gray-900 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ScrollText className="h-6 w-6 text-[#d47615]" />
            <h2 className="text-xl font-bold text-white">Electronic Contract Agreement</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                This electronic contract facilitates a secure escrow transaction between two parties on the Citrea Testnet. 
                By signing this agreement, both parties commit to the terms and conditions outlined below.
              </p>
            </div>
            
            <button
              onClick={() => setShowContractDetails(!showContractDetails)}
              className="flex items-center space-x-2 text-[#d47615] hover:text-[#d47615]/80 transition-colors"
            >
              <span className="font-medium">Full Terms</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showContractDetails ? 'rotate-180' : ''}`} />
            </button>
            
            {showContractDetails && (
              <div className="space-y-4 border-t border-gray-700 pt-4">
                <div className="grid gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-[#d47615]" />
                      Agreement Overview
                    </h4>
                    <p className="text-gray-300 text-sm">
                      This contract establishes a trustless escrow mechanism where Party A deposits an NFT and Party B deposits ETH. 
                      The smart contract ensures secure exchange without requiring trust between parties.
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-[#d47615]" />
                      Party Obligations
                    </h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Party A: Must deposit the specified NFT to the escrow contract</li>
                      <li>• Party B: Must deposit the agreed ETH amount to the escrow contract</li>
                      <li>• Both parties: Must sign this agreement to activate the contract</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-[#d47615]" />
                      Execution Process
                    </h4>
                    <ol className="text-gray-300 text-sm space-y-1">
                      <li>1. Both parties sign this electronic agreement</li>
                      <li>2. Party A deposits NFT to the escrow contract</li>
                      <li>3. Party B deposits ETH to the escrow contract</li>
                      <li>4. Smart contract automatically executes the exchange</li>
                    </ol>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-[#d47615]" />
                      Security & Trust Mechanisms
                    </h4>
                    <p className="text-gray-300 text-sm">
                      All transactions are secured by smart contract logic on Citrea Testnet. Funds and assets are held in escrow 
                      until both parties fulfill their obligations. No central authority can access or control the escrowed assets.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-300 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Risk Disclosure
                    </h4>
                    <p className="text-yellow-200 text-sm">
                      This is a testnet contract for demonstration purposes. Do not use real assets of significant value. 
                      Smart contracts carry inherent risks including potential bugs or network issues.
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-[#d47615]" />
                      Legal Binding
                    </h4>
                    <p className="text-gray-300 text-sm">
                      By signing this agreement, both parties acknowledge they have read, understood, and agree to be bound by these terms. 
                      Digital signatures are legally binding and equivalent to handwritten signatures.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-300 mb-1">Important Notice</h4>
                  <p className="text-blue-200 text-sm">
                    You must connect your wallet and be on the Citrea Testnet to sign this agreement. 
                    Your signature will be cryptographically verified and stored on-chain.
                  </p>
                </div>
              </div>
            </div>
            
            {!isConnected && (
              <div className="bg-orange-900 border border-orange-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Wallet className="h-5 w-5 text-orange-400" />
                  <div>
                    <h4 className="font-semibold text-orange-300">Wallet Connection Required</h4>
                    <p className="text-orange-200 text-sm">Please connect your wallet to proceed with signing this contract.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Signature Section - Only show before both parties sign */}
        {!bothPartiesSigned && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white flex items-center mb-6">
              <Signature className="h-6 w-6 mr-3 text-[#d47615]" />
              Digital Signatures
            </h2>
          
          {/* Side by Side Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Party A Signature */}
            <div className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700 hover:border-[#d47615]/50 transition-colors">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    partyASigned 
                      ? 'bg-[#d47615] border-[#d47615]' 
                      : 'border-gray-600 hover:border-[#d47615]'
                  }`}>
                    {partyASigned && <Check className="h-5 w-5 text-black" />}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white font-semibold text-lg">Party A</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {contract.partyAAddress ? 
                      `${contract.partyAAddress.slice(0, 8)}...${contract.partyAAddress.slice(-6)}` : 
                      'Contract Deployer'
                    }
                  </p>
                </div>
                
                <div className="border-t border-gray-600 pt-4">
                  {!isConnected ? (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs">Connect wallet to sign</p>
                      <ConnectButton />
                    </div>
                  ) : isPartyA ? (
                    !partyASigned ? (
                      <button
                        onClick={() => handleSignContract('A')}
                        disabled={isSigningA}
                        className="w-full bg-[#d47615] hover:bg-[#d47615]/80 text-black px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSigningA ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            <span>Signing...</span>
                          </div>
                        ) : (
                          'Sign Contract'
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2 text-[#d47615]">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Signed</span>
                        </div>
                        <p className="text-gray-400 text-xs">Contract signed successfully</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <span className="text-yellow-400 text-sm font-medium">Wrong Wallet</span>
                      <p className="text-gray-400 text-xs">Connect Party A wallet to sign</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Party B Signature */}
            <div className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700 hover:border-[#d47615]/50 transition-colors">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    partyBSigned 
                      ? 'bg-[#d47615] border-[#d47615]' 
                      : 'border-gray-600 hover:border-[#d47615]'
                  }`}>
                    {partyBSigned && <Check className="h-5 w-5 text-black" />}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white font-semibold text-lg">Party B</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {contract.partyBAddress ? 
                      `${contract.partyBAddress.slice(0, 8)}...${contract.partyBAddress.slice(-6)}` : 
                      'Awaiting Assignment'
                    }
                  </p>
                </div>
                
                <div className="border-t border-gray-600 pt-4">
                  {!isConnected ? (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs">Connect wallet to sign</p>
                      <ConnectButton />
                    </div>
                  ) : isPartyB ? (
                    !partyBSigned ? (
                      <button
                        onClick={() => handleSignContract('B')}
                        disabled={isSigningB}
                        className="w-full bg-[#d47615] hover:bg-[#d47615]/80 text-black px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSigningB ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                            <span>Signing...</span>
                          </div>
                        ) : (
                          'Sign Contract'
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2 text-[#d47615]">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Signed</span>
                        </div>
                        <p className="text-gray-400 text-xs">Contract signed successfully</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <span className="text-yellow-400 text-sm font-medium">Wrong Wallet</span>
                      <p className="text-gray-400 text-xs">Connect Party B wallet to sign</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Contract Execution Status */}
        {partyASigned && partyBSigned && (
          <div className="mb-8 bg-green-900 border border-green-700 p-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-400 mb-2">Contract Fully Executed</h2>
              <p className="text-green-300">Both parties have signed. Contract is now active and ready for deposits.</p>
            </div>
          </div>
        )}

        {/* Enhanced Escrow Interface - Only show after both signatures */}
        {partyASigned && partyBSigned && (
          <TransactionalHandling 
            contract={contract}
            isPartyA={isPartyA}
            isPartyB={isPartyB}
            userAddress={address}
          />
        )}
      </div>
    </div>
  )
}