import React from 'react';
import { useAccount } from 'wagmi';

const PreBuiltTemplates = () => {
  const { isConnected } = useAccount();
  
  const templates = [
    { title: 'Game Key Rental', description: 'Rent out your game keys for a set period of time.' },
    { title: 'Domain Lease Agreement', description: 'Lease your domain name to another person or entity.' },
    { title: 'Gift Card Exchange', description: 'Exchange your gift cards for other goods or services.' },
  ];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-black text-white font-mono rounded-lg border border-[#d47615] max-w-md mx-auto">
        <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-[#d47615]">
          <h2 className="text-xl font-bold text-[#d47615] mb-2 text-center">Connect Your Wallet</h2>
          <p className="text-gray-300 text-center text-sm mb-4">
            Please connect your wallet to access pre-built contract templates and start creating secure escrow agreements.
          </p>
          <div className="flex justify-center">
            <div className="w-12 h-12 border-2 border-[#d47615] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#d47615]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 max-w-4xl mx-auto">
      <div className="w-full bg-black text-white font-mono p-6 rounded-lg border border-[#d47615]">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#d47615]">Pre-Built Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template, index) => (
            <div key={index} className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-[#d47615] transition-colors cursor-pointer group">
              <h3 className="font-bold text-[#d47615] mb-2 group-hover:text-white transition-colors">{template.title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{template.description}</p>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <span className="text-xs text-[#d47615] font-mono">Click to use template</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 font-mono">
            Select a template above to create a new escrow contract
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreBuiltTemplates;