'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Code, ExternalLink, FileText, Check, AlertTriangle } from 'lucide-react'
import { publicClient } from '@/walletConnect/siwe'
import { useWalletClient, useAccount } from 'wagmi'

import { PieChart } from 'react-minimal-pie-chart'

export function SmartContractDisplay({ contractCode }: { contractCode: string }) {
  const [isDeployed, setIsDeployed] = useState(false)
  const [showCode, setShowCode] = useState(true)
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)
  const { data: walletClient } = useWalletClient()
  const { address: walletAddress, isConnected } = useAccount()
  const [solidityScanResults, setSolidityScanResults] = useState<any>(null)
  const [showScanComments, setShowScanComments] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [compiledContract, setCompiledContract] = useState<any>(null)
  const [contractId, setContractId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isCompiling, setIsCompiling] = useState(false)
  const [compilationStatus, setCompilationStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle')
  const [compilationError, setCompilationError] = useState<string>('')


  const handleCopy = () => {
    navigator.clipboard.writeText(contractCode)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }



  const compileContract = async ({ sourceCode }: { sourceCode: string }) => {
    try {
      setIsCompiling(true);
      setCompilationStatus('compiling');
      setCompilationError('');

      // Check if contract has imports that require flattening
      const hasImports = sourceCode.includes('import ');
      const useFlattening = hasImports;

      // Extract contract name from source code
      const contractMatch = sourceCode.match(/contract\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:is\s+[^{]*)?\s*\{/);
      const contractName = contractMatch ? contractMatch[1] : 'Contract';

      console.log(`Contract: ${contractName}, has imports: ${hasImports}, using flattening: ${useFlattening}`);

      // Compile contract via backend API
      const compileResponse = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sourceCode,
          contractName,
          useFlattening
        }),
      });

      if (!compileResponse.ok) {
        const errorData = await compileResponse.json();
        throw new Error(`Compilation failed: ${errorData.details || compileResponse.statusText}`);
      }

      const result = await compileResponse.json();
      
      if (!result.success) {
        throw new Error(`Compilation failed: ${result.error || 'Unknown error'}`);
      }

      const { abi, bytecode } = result;
      setCompiledContract({ abi, bytecode });
      setCompilationStatus('success');
      
      console.log('Contract compiled successfully:', { abi, bytecode });
      return { abi, bytecode };
    } catch (error) {
      console.error('Error compiling contract:', error);
      setCompilationStatus('error');
      setCompilationError(error instanceof Error ? error.message : 'Unknown compilation error');
      throw error;
    } finally {
      setIsCompiling(false);
    }
  }

  const deployContract = async () => {
    try {
      if (!compiledContract) {
        throw new Error("Contract must be compiled first");
      }

      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      if (!walletAddress) {
        throw new Error("Wallet address not available");
      }

      const { abi, bytecode } = compiledContract;

      console.log('Deploying contract with:', { abi, bytecode, walletAddress });

      //@ts-ignore
      const hash = await walletClient.deployContract({
        //@ts-ignore
        abi,
        bytecode,
        account: walletAddress,
        args: [],
      });

      console.log('Contract deployed. Transaction hash:', hash);

      if (hash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Contract deployed at:', receipt.contractAddress);
        return { 
          contractAddress: receipt.contractAddress, 
          transactionHash: hash,
          abi,
          bytecode
        };
      }
    } catch (error) {
      console.error('Error deploying contract:', error);
      throw error;
    }
  }



  const handleDeploy = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!walletClient) {
      setError('Wallet client not available');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const hashaddress = await deployContract();

      if (hashaddress && hashaddress.contractAddress) {
        setDeployedAddress(hashaddress.contractAddress);
        setShowCode(false);
        setIsDeployed(true);
        
        // Save contract data to JSON storage
        await saveContractData({
          contractAddress: hashaddress.contractAddress,
          transactionHash: hashaddress.transactionHash || '',
          abi: hashaddress.abi,
          bytecode: hashaddress.bytecode
        });


      }
    } catch (error) {
      console.error('Deployment failed:', error);
      setError(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsLoading(false);
    }
  }
  
  const saveContractData = async (deploymentData: any) => {
    try {
      if (!walletAddress || !deploymentData.abi || !deploymentData.bytecode) {
        console.error('Missing wallet address or compiled contract data');
        return;
      }
      
      const contractData = {
        name: 'Escrow', // Placeholder name
        contractAddress: deploymentData.contractAddress,
        abi: deploymentData.abi,
        bytecode: deploymentData.bytecode,
        contractType: getContractType('Escrow'), // Placeholder type
        partyA: walletAddress,
        partyAAddress: walletAddress,
        transactionHash: deploymentData.transactionHash,
        networkId: 'citrea-testnet',
        description: getContractDescription('Escrow') // Placeholder description
      }
      
      console.log('Saving contract data:', contractData);
      
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save contract: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.contract && result.contract.id) {
        setContractId(result.contract.id);
        console.log('Contract data saved with ID:', result.contract.id);
      } else {
        console.error('Invalid response format:', result);
      }
    } catch (error) {
      console.error('Error saving contract data:', error);
      setError('Contract deployed but failed to save data');
    }
  }
  
  const getContractType = (contractName: string): string => {
    // This function will need to be updated to dynamically determine contract type
    // based on the compiled ABI or other metadata.
    return 'General Escrow';
  }
  
  const getContractDescription = (contractName: string): string => {
    // This function will need to be updated to dynamically determine contract description
    // based on the compiled ABI or other metadata.
    return 'General purpose escrow contract';
  }

  const toggleCode = () => {
    setShowCode(!showCode)
  }
 
  // Placeholder values for now
  const roundedSecurityScore = 75;
  const roundedThreatScore = 25;

  return (
    <div className="w-full max-w-2xl bg-gray-900 text-white rounded-md overflow-hidden border border-white font-mono">
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Escrow Contract</h3>
          {!isDeployed && (
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          )}
        </div>
        
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        {showCode && (
          <ScrollArea className="h-96 w-full border border-white rounded-md p-2">
            <pre className="text-sm">
              <code>{contractCode}</code>
            </pre>
          </ScrollArea>
        )}
        
        {isDeployed && !showCode && (
          <div className="bg-gray-900 p-4 rounded-md border border-[#FFC700] mb-4">
            <div className="space-y-2">
              <p className="text-green-400 font-semibold">Contract deployed successfully!</p>
              <p className="text-sm">
                <span className="text-gray-300">Contract Address:</span>{' '}
                <span className="text-blue-400 break-all cursor-pointer" onClick={() => navigator.clipboard.writeText(deployedAddress)} title="Click to copy">
                  {deployedAddress}
                </span>
              </p>
              
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-300 mt-2 mb-2">Manage your deployed contract:</p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => window.open(`https://explorer.testnet.citrea.xyz/address/${deployedAddress}`, '_blank')} 
                    className="bg-[#d47615] text-black rounded-none hover:bg-[#d47615]/80 transition-colors duration-200"
                  >
                    Check on Explorer
                  </Button>
                  {contractId && (
                    <Button 
                      onClick={() => window.open(`/contract/${contractId}`, '_blank')} 
                      className="bg-green-600 text-white rounded-none hover:bg-green-700 transition-colors duration-200"
                    >
                      Open Contract Page
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-[#d47615] text-black p-4 rounded-b-md">
        {!isDeployed ? (
          <div className="space-y-4 w-full">
            {/* Side by side buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={() => compileContract({ sourceCode: contractCode })}
                disabled={isCompiling || !contractCode.trim() || compilationStatus === 'success'}
                className={`flex-1 font-semibold py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center ${
                  compilationStatus === 'success' 
                    ? 'bg-green-600 text-white cursor-not-allowed' 
                    : 'bg-[#FFC700] text-black hover:bg-[#FFD700] disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isCompiling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Compiling...
                  </>
                ) : compilationStatus === 'success' ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Compiled
                  </>
                ) : (
                  'Compile Contract'
                )}
              </Button>
              
              <Button 
                onClick={handleDeploy} 
                disabled={isLoading || !isConnected || compilationStatus !== 'success'}
                className="flex-1 bg-black text-white border border-white hover:bg-white hover:text-black transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-2 px-4 rounded-md"
              >
                {isLoading ? (
                  <>
                    <span className="animate-pulse mr-2">●</span>
                    Deploying...
                  </>
                ) : !isConnected ? (
                  'Connect Wallet First'
                ) : (
                  'Deploy Contract'
                )}
              </Button>
            </div>
            
            {/* Compilation status */}
            {compilationStatus === 'compiling' && (
              <div className="p-3 border border-white rounded-md bg-black/20">
                <div className="flex items-center text-white">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Compiling contract...
                </div>
              </div>
            )}
            
            {compilationStatus === 'error' && (
              <div className="p-3 border border-red-400 rounded-md bg-red-900/20">
                <div className="text-red-400">
                  ❌ Compilation failed: {compilationError}
                </div>
              </div>
            )}
            
            {compilationStatus !== 'success' && compilationStatus !== 'idle' && (
              <p className="text-sm text-black/70 text-center">
                Please compile the contract first before deploying
              </p>
            )}
        </div>
        ) : (
          <div className="flex justify-between items-center w-full">
            <span className="text-sm font-medium">Contract deployed successfully!</span>
            <a
              href={`https://explorer.testnet.citrea.xyz/address/${deployedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-white hover:text-black transition-colors duration-200 flex items-center"
            >
              View Contract <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        )}
      </div>
      
      {/* Show SolidityScan Results only after successful compilation */}
      {compilationStatus === 'success' && (
        <div className="p-4 border-t border-white">
          <h4 className="text-lg font-semibold mb-4">SolidityScan Results</h4>
          <div className="mb-4 p-3 border border-green-400 rounded-md bg-green-900/20">
            <div className="text-green-400 flex items-center">
              <Check className="w-4 h-4 mr-2" />
              Contract compiled successfully! Security analysis available.
            </div>
            <div className="mt-2 text-sm text-gray-300">
              <p>ABI: {compiledContract?.abi ? 'Generated' : 'Not available'}</p>
              <p>Bytecode: {compiledContract?.bytecode ? `${compiledContract.bytecode.slice(0, 20)}...` : 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-start mb-6">
            <div className="w-1/2 pr-4">
              <div className="w-32 h-32 mx-auto">
                {/* Placeholder for PieChart */}
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl font-bold">
                  {roundedSecurityScore}%
                </div>
              </div>
              <p className="text-center mt-2 text-sm">Security Score</p>
            </div>
            <div className="w-1/2 pl-4">
              <div className="w-32 h-32 mx-auto">
                {/* Placeholder for PieChart */}
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl font-bold">
                  {roundedThreatScore}%
                </div>
              </div>
              <p className="text-center mt-2 text-sm">Threat Score</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowScanComments(!showScanComments)} 
            className="mb-4 bg-black text-white border border-white hover:bg-white hover:text-black transition-colors duration-200 w-full"
          >
            {showScanComments ? 'Hide' : 'Show'} Scan Comments
          </Button>
          {showScanComments && (
            <div className="text-sm mt-2 space-y-4">
              <div className="bg-gray-900 p-3 rounded-md">
                <h5 className="font-semibold mb-2 text-[#FFC700]">Security Score Comments:</h5>
                <p>Placeholder comments for security score.</p>
              </div>
              <div className="bg-gray-900 p-3 rounded-md">
                <h5 className="font-semibold mb-2 text-[#FF69B4]">Security Scan Comments:</h5>
                <p>Placeholder comments for security scan.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}