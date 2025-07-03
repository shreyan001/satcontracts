'use client';

import { useEffect } from 'react';
import { useChainId, useAccount } from 'wagmi';
import { citreaTestnet } from '@/walletConnect/siwe';

export function useSIWEGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  
  const isCorrectChain = chainId === citreaTestnet.id;
  const canAuthenticate = isConnected && isCorrectChain;

  useEffect(() => {
    // Override Web3Modal's SIWE flow if chain is wrong
    if (isConnected && !isCorrectChain) {
      // Intercept any SIWE attempts
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0] as string;
        
        // Block SIWE-related requests when on wrong chain
        if (typeof url === 'string' && url.includes('/api/auth/')) {
          console.warn('SIWE blocked: Wrong chain detected');
          return Promise.reject(new Error(`Please switch to Citrea Testnet (Chain ID: ${citreaTestnet.id}) before signing in`));
        }
        
        return originalFetch.apply(this, args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [isConnected, isCorrectChain]);

  return {
    isConnected,
    isCorrectChain,
    canAuthenticate,
    requiredChainId: citreaTestnet.id,
    currentChainId: chainId,
  };
}

export default useSIWEGuard;
