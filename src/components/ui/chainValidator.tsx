'use client';

import { useChainId, useAccount } from 'wagmi';
import { citreaTestnet, validateAndSwitchChain } from '@/walletConnect/siwe';
import { Button } from './button';
import { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ChainValidatorProps {
  className?: string;
  showSuccess?: boolean;
}

export function ChainValidator({ className = '', showSuccess = true }: ChainValidatorProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [isSwitching, setIsSwitching] = useState(false);
  
  const isCorrectChain = chainId === citreaTestnet.id;
  
  const handleSwitchChain = async () => {
    setIsSwitching(true);
    try {
      await validateAndSwitchChain();
    } catch (error) {
      console.error('Failed to switch chain:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  if (isCorrectChain) {
    return showSuccess ? (
      <div className={`flex items-center gap-2 text-green-600 dark:text-green-400 ${className}`}>
        <CheckCircle size={16} />
        <span className="text-sm">Connected to Citrea Testnet</span>
      </div>
    ) : null;
  }

  return (
    <div className={`flex flex-col items-center gap-3 p-4 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-400/10 ${className}`}>
      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
        <AlertTriangle size={16} />
        <span className="text-sm font-medium">Wrong Network Detected</span>
      </div>
      <p className="text-sm text-center text-yellow-700 dark:text-yellow-300">
        Please switch to Citrea Testnet (Chain ID: {citreaTestnet.id}) to use this application.
      </p>
      <Button 
        onClick={handleSwitchChain}
        disabled={isSwitching}
        size="sm"
        className="bg-yellow-600 hover:bg-yellow-700 text-white"
      >
        {isSwitching ? 'Switching...' : 'Switch to Citrea Testnet'}
      </Button>
    </div>
  );
}

export default ChainValidator;
