'use client';

import { useChainId, useAccount } from 'wagmi';
import { citreaTestnet, validateAndSwitchChain } from '@/walletConnect/siwe';
import { useState, useCallback } from 'react';

export function useChainValidation() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [isSwitching, setIsSwitching] = useState(false);
  
  const isCorrectChain = chainId === citreaTestnet.id;
  const isReady = isConnected && isCorrectChain;
  
  const switchToCorrectChain = useCallback(async () => {
    if (isSwitching) return false;
    
    setIsSwitching(true);
    try {
      const success = await validateAndSwitchChain();
      return success;
    } catch (error) {
      console.error('Failed to switch chain:', error);
      return false;
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching]);
  
  const requireCorrectChain = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (isCorrectChain) {
      return true;
    }
    
    return await switchToCorrectChain();
  }, [isConnected, isCorrectChain, switchToCorrectChain]);
  
  return {
    isConnected,
    isCorrectChain,
    isReady,
    isSwitching,
    chainId,
    requiredChainId: citreaTestnet.id,
    switchToCorrectChain,
    requireCorrectChain,
  };
}

export default useChainValidation;
