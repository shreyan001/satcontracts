'use client';

import { ReactNode } from 'react';
import { useChainValidation } from '@/hooks/useChainValidation';
import { ChainValidator } from './chainValidator';

interface ChainGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showConnectPrompt?: boolean;
  className?: string;
}

export function ChainGuard({ 
  children, 
  fallback, 
  showConnectPrompt = true,
  className = '' 
}: ChainGuardProps) {
  const { isConnected, isCorrectChain, isReady } = useChainValidation();

  if (!isConnected && showConnectPrompt) {
    return (
      <div className={`flex flex-col items-center gap-4 p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground text-center">
          Please connect your wallet to continue
        </p>
        <w3m-button />
      </div>
    );
  }

  if (!isReady) {
    return fallback || <ChainValidator className={className} showSuccess={false} />;
  }

  return <>{children}</>;
}

export default ChainGuard;
