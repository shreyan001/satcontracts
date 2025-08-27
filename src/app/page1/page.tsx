'use client';

import { useState } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { publicClient } from '@/walletConnect/siwe';
import { Button } from '@/components/ui/button';
import { Copy, Check, Play, Code, AlertTriangle } from 'lucide-react';
import ConnectButton from '@/components/ui/walletButton';

export default function ContractPage() {
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationResult, setCompilationResult] = useState<any>(null);
  const [compilationError, setCompilationError] = useState<string>('');
  const [contractABI, setContractABI] = useState<any[]>([]);
  const [contractBytecode, setContractBytecode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const { data: walletClient } = useWalletClient();
  const { address: walletAddress, isConnected } = useAccount();

  // Default SimpleStorage contract code - editable
  const [contractCode, setContractCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedData;
    
    event DataStored(uint256 indexed value, address indexed sender);
    
    constructor(uint256 initialValue) {
        storedData = initialValue;
    }
    
    function set(uint256 value) public {
        storedData = value;
        emit DataStored(value, msg.sender);
    }
    
    function get() public view returns (uint256) {
        return storedData;
    }
    
    function increment() public {
        storedData += 1;
        emit DataStored(storedData, msg.sender);
    }
}`);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const compileContract = async () => {
    console.log('🔥 COMPILE BUTTON CLICKED!');
    try {
      console.log('🚀 Starting compilation process...');
      setIsCompiling(true);
      setCompilationError('');
      setCompilationResult(null);
      setIsCompiled(false);
      
      console.log('📝 Contract code to compile:', contractCode.substring(0, 100) + '...');
      
      // Call the compilation API
      console.log('📡 Making API call to /api/compile...');
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: contractCode }),
      });
      
      console.log('📨 Response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('📦 Backend response data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('❌ Backend compilation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          warnings: data.warnings
        });
        
        // Format detailed error message
        let errorMessage = data.error || 'Compilation failed';
        if (data.details && Array.isArray(data.details)) {
          const errorDetails = data.details.map((detail: any) => {
            if (typeof detail === 'object' && detail.message) {
              return `• ${detail.message}`;
            }
            return `• ${detail}`;
          }).join('\n');
          errorMessage += '\n\nDetails:\n' + errorDetails;
        } else if (data.details) {
          errorMessage += '\n\nDetails: ' + data.details;
        }
        
        console.log('🔍 Formatted error message:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('✅ Backend compilation successful!');
      console.log('📋 ABI:', data.abi);
      console.log('💾 Bytecode length:', data.bytecode?.length || 0);
      
      // Store the compiled ABI and bytecode
      setContractABI(data.abi);
      setContractBytecode(`0x${data.bytecode}`);
      
      // Create compilation result for display
      const result = {
        success: true,
        contractName: extractContractName(contractCode),
        bytecodeSize: data.bytecode.length,
        gasEstimate: estimateGas(data.bytecode),
        warnings: data.warnings || [],
        abi: data.abi
      };
      
      setCompilationResult(result);
      setIsCompiled(true);
      console.log('🎉 Frontend compilation state updated:', result);
      
    } catch (error) {
      console.error('💥 Compilation error caught:', error);
      console.error('📊 Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      setCompilationError((error as Error).message);
      setIsCompiled(false);
      setContractABI([]);
      setContractBytecode('');
    } finally {
      setIsCompiling(false);
      console.log('🏁 Compilation process finished');
    }
  };
  
  const extractContractName = (code: string): string => {
    const match = code.match(/contract\s+(\w+)/);
    return match ? match[1] : 'Unknown';
  };
  
  const estimateGas = (bytecode: string): string => {
    // Simple gas estimation based on bytecode length
    const gasEstimate = Math.floor(bytecode.length / 2 * 200);
    return gasEstimate.toLocaleString();
  };

  const verifyContract = async (contractAddress: string, sourceCode: string) => {
    try {
      setIsVerifying(true);
      setVerificationStatus('verifying');
      setVerificationError('');
      setVerificationResult(null);

      // Extract contract name from source code
      const contractNameMatch = sourceCode.match(/contract\s+(\w+)/);
      const contractName = contractNameMatch ? contractNameMatch[1] : 'Contract';

      // Prepare verification data for Blockscout API
      const verificationData = {
        addressHash: contractAddress,
        name: contractName,
        compilerVersion: 'v0.8.0+commit.c7dfd78e', // Default Solidity version
        optimization: false,
        contractSourceCode: sourceCode
      };

      console.log('Verifying contract with data:', verificationData);

      // Use our backend API route to avoid CORS issues
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Verification failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Verification response:', result);

      setVerificationResult({
        ...result.result,
        blockscoutUrl: result.blockscoutUrl
      });
      setVerificationStatus('success');
      console.log('Contract verified successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Error verifying contract:', error);
      setVerificationStatus('error');
      setVerificationError(error instanceof Error ? error.message : 'Unknown verification error');
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const deployContract = async () => {
    try {
      if (!walletClient || !walletAddress) {
        throw new Error('Wallet not connected');
      }
      
      if (!contractABI.length || !contractBytecode) {
        throw new Error('Contract not compiled. Please compile first.');
      }

      setIsLoading(true);
      console.log('Deploying contract with ABI:', contractABI, 'and bytecode:', contractBytecode);
      
      // Extract constructor parameters from ABI
      const constructor = contractABI.find(item => item.type === 'constructor');
      let args: any[] = [];
      
      if (constructor && constructor.inputs && constructor.inputs.length > 0) {
        // For SimpleStorage, we use 42 as default initial value
        args = [BigInt(42)];
      }
      
      // Deploy contract using the compiled ABI and bytecode
      //@ts-ignore
      const hash = await walletClient.deployContract({
        //@ts-ignore
        abi: contractABI,
        bytecode: contractBytecode as `0x${string}`,
        account: walletAddress,
        args: args,
      });

      console.log('Contract deployed. Transaction hash:', hash);

      if (hash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Contract deployed at:', receipt.contractAddress);
        setDeployedAddress(receipt.contractAddress || '');
        setIsDeployed(true);
        
        // Automatically verify contract after deployment
        if (receipt.contractAddress) {
          try {
            await verifyContract(receipt.contractAddress, contractCode);
          } catch (verificationError) {
            console.warn('Contract deployed but verification failed:', verificationError);
            // Don't fail the deployment if verification fails
          }
        }
      }
    } catch (error) {
      console.error('Error deploying contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Failed to deploy contract: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug logging
  console.log('🔍 Debug state:', {
    isCompiling,
    contractCodeLength: contractCode.length,
    contractCodeTrimmed: contractCode.trim().length,
    isConnected,
    isCompiled,
    contractABILength: contractABI.length,
    contractBytecode: contractBytecode.substring(0, 20) + '...'
  });

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      {/* Header */}
      <nav className="flex justify-between items-center p-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Code className="w-8 h-8" />
          <span className="text-xl font-bold">Smart Contract IDE</span>
        </div>
        <ConnectButton />
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col p-6">
          {/* Contract Editor */}
          <div className="flex-1 mb-4">
            <h2 className="text-lg font-semibold mb-3">Contract Editor</h2>
            <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 h-full">
              <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm ml-4">SimpleStorage.sol</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="text-gray-400 hover:text-white"
                >
                  {isCopied ? (
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Copied!
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Copy className="w-4 h-4" />
                      Copy
                    </div>
                  )}
                </Button>
              </div>
              
              <textarea
                value={contractCode}
                onChange={(e) => {
                  setContractCode(e.target.value);
                  // Reset compilation state when code changes
                  setIsCompiled(false);
                  setCompilationResult(null);
                  setCompilationError('');
                  setContractABI([]);
                  setContractBytecode('');
                }}
                className="w-full h-full bg-gray-900 text-green-400 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border-none min-h-96"
                placeholder="Enter your Solidity contract code here..."
                spellCheck={false}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mb-4">
            <Button 
              onClick={(e) => {
                console.log('🖱️ Button click event triggered!', e);
                compileContract();
              }}
              disabled={isCompiling || !contractCode.trim()}
              className="bg-black text-white border border-white rounded-md px-6 py-2 text-sm hover:bg-white hover:text-black transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompiling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Compile</span>
                </>
              )}
            </Button>

            <Button 
              onClick={() => {
                console.log('🧪 Testing error handling...');
                const originalCode = contractCode;
                setContractCode('invalid solidity code here');
                setTimeout(() => {
                  compileContract().then(() => {
                    // Restore original code after test
                    setTimeout(() => setContractCode(originalCode), 2000);
                  });
                }, 100);
              }}
              disabled={isCompiling}
              className="bg-red-600 text-white border border-red-500 rounded-md px-4 py-2 text-sm hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Test Error</span>
            </Button>

            <Button 
              onClick={deployContract}
              disabled={!isConnected || !isCompiled || isLoading || isDeployed || !contractABI.length || !contractBytecode}
              className="bg-black text-white border border-white rounded-md px-6 py-2 text-sm hover:bg-white hover:text-black transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Deploying...</span>
                </>
              ) : isDeployed ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Deployed</span>
                </>
              ) : !isConnected ? (
                <span>Connect Wallet</span>
              ) : !isCompiled ? (
                <span>Compile First</span>
              ) : (
                <span>Deploy</span>
              )}
            </Button>
          </div>

          {/* Status Messages */}
          {compilationResult && (
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-4">
              <h3 className="text-green-400 font-semibold mb-2">✅ Compilation Successful!</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-300">Contract:</span>
                  <code className="ml-2 text-green-400">{compilationResult.contractName}</code>
                </div>
                <div>
                  <span className="text-gray-300">Bytecode Size:</span>
                  <code className="ml-2 text-green-400">{compilationResult.bytecodeSize} bytes</code>
                </div>
              </div>
              {compilationResult.warnings && compilationResult.warnings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-600">
                  <h4 className="text-yellow-400 font-medium mb-2">⚠️ Warnings:</h4>
                  <div className="space-y-1">
                    {compilationResult.warnings.map((warning: any, index: number) => (
                      <div key={index} className="text-yellow-300 text-sm">
                        • {warning.message || warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {compilationError && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4">
              <h3 className="text-red-400 font-semibold mb-2">❌ Compilation Failed</h3>
              <div className="text-red-300 text-sm whitespace-pre-wrap font-mono">
                {compilationError}
              </div>
              <div className="mt-3 pt-3 border-t border-red-600">
                <p className="text-red-200 text-xs">
                  💡 Check the browser console (F12) for detailed backend error logs
                </p>
              </div>
            </div>
          )}

          {isDeployed && deployedAddress && (
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-2">✅ Contract Deployed!</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-300 text-sm">Address:</span>
                <code className="bg-black/30 px-2 py-1 rounded text-green-400 text-sm font-mono">
                  {deployedAddress}
                </code>
              </div>
              
              {/* Verification Status */}
              <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-300">Verification Status:</span>
                  {verificationStatus === 'verifying' && (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                      <span className="text-sm text-green-400">Verifying...</span>
                    </div>
                  )}
                  {verificationStatus === 'success' && (
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Verified</span>
                    </div>
                  )}
                  {verificationStatus === 'error' && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Failed</span>
                    </div>
                  )}
                  {verificationStatus === 'idle' && (
                    <span className="text-sm text-gray-500">Not verified</span>
                  )}
                </div>
                
                {verificationError && (
                  <p className="text-xs text-red-400 mt-1">{verificationError}</p>
                )}
                
                {verificationResult && verificationStatus === 'success' && (
                  <div className="mt-2">
                    <p className="text-xs text-green-400">Contract source code verified on Blockscout</p>
                    <a 
                      href={`https://citrea-testnet.blockscout.com/address/${deployedAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      View on Blockscout →
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                {verificationStatus !== 'success' && verificationStatus !== 'verifying' && (
                  <Button
                    size="sm"
                    onClick={() => verifyContract(deployedAddress, contractCode)}
                    disabled={isVerifying}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Contract'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(deployedAddress)}
                  className="text-green-400 hover:text-green-300"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}