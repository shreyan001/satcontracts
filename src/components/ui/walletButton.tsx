'use client';

import { useChainValidation } from '@/hooks/useChainValidation';
import { Button } from './button';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConnectButton() {
  const { 
    isConnected, 
    isCorrectChain, 
    isSwitching, 
    switchToCorrectChain,
    requiredChainId 
  } = useChainValidation();

  if (isConnected && !isCorrectChain) {
    return (
      <div className="flex flex-col items-center gap-3 max-w-sm">
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">Wrong Network</span>
        </div>
        <p className="text-sm text-center text-muted-foreground">
          Please switch to Citrea Testnet (Chain ID: {requiredChainId}) to continue.
        </p>
        <Button 
          onClick={switchToCorrectChain}
          disabled={isSwitching}
          variant="outline"
          size="sm"
          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-yellow-400/10"
        >
          {isSwitching ? 'Switching...' : 'Switch to Citrea Testnet'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {isConnected && isCorrectChain && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle size={16} />
          <span className="text-sm">Connected to Citrea Testnet</span>
        </div>
      )}
      <w3m-button />
    </div>
  );
}