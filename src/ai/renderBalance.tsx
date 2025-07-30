'use client'
import { ethers } from 'ethers';
import React, { useState, useEffect } from 'react';

interface BalanceDisplayProps {
  address: string | { address: string };
}

function BalanceDisplay({ address }: BalanceDisplayProps) {
  const [balanceInEth, setBalanceInEth] = useState<string>('Loading...');
  const [displayAddress, setDisplayAddress] = useState<string>('');

  useEffect(() => {
    // Determine the actual address string
    const addressValue = typeof address === 'object' ? address.address : address;
    setDisplayAddress(addressValue);

    async function fetchBalance() {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ETH_RPC_URL);
        const balance = await provider.getBalance(addressValue);
        setBalanceInEth(ethers.formatEther(balance));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalanceInEth('Error');
      }
    }

    fetchBalance();
  }, [address]);

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Ethereum Balance</h2>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Address:</span>
        <span className="text-sm text-gray-500 truncate max-w-[150px]">{displayAddress}</span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-gray-600">Balance:</span>
        <span className="text-lg font-bold text-blue-600">{balanceInEth} ETH</span>
      </div>
    </div>
  );
}

export default BalanceDisplay;
