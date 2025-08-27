import { createStreamableUI } from 'ai/rsc';
import nodegraph from './graph';
import { AIMessageText, HumanMessageText } from "@/components/ui/message";
import { ReactNode } from 'react';
import { AIProvider } from './client';
import { BaseMessage } from '@langchain/core/messages';
import BalanceDisplay from './renderBalance';
import { Runnable } from '@langchain/core/runnables';
import { SmartContractDisplay } from '@/components/ui/ContractUI';

// Helper function to determine contract type from contract code
function getContractType(contractCode: string): string {
  if (contractCode.includes('SocialWager') || contractCode.includes('Wager')) return 'social_wager';

  if (contractCode.includes('CBTC')) return 'cbtc_exchange';
  if (contractCode.includes('NFT')) return 'nft_exchange';
  if (contractCode.includes('MultiParty') || contractCode.includes('Assembly')) return 'assembly_contract';
  if (contractCode.includes('TimeBased') || contractCode.includes('Rental')) return 'time_based';
  if (contractCode.includes('Bounty')) return 'bounty';
  if (contractCode.includes('GameKey')) return 'game_key';
  if (contractCode.includes('SaaS') || contractCode.includes('Subscription')) return 'saas';
  if (contractCode.includes('Domain')) return 'domain_lease';
  return 'standard_escrow';
}

// Enhanced UI component for different contract types
function ContractTypeIndicator({ contractType }: { contractType: string }) {
  const typeConfig = {
    social_wager: { emoji: '🎲', label: 'Social Wager', color: 'bg-purple-100 text-purple-800' },
    cbtc_exchange: { emoji: '₿', label: 'CBTC Exchange', color: 'bg-yellow-100 text-yellow-800' },
    nft_exchange: { emoji: '🖼️', label: 'NFT Exchange', color: 'bg-blue-100 text-blue-800' },
    assembly_contract: { emoji: '🔧', label: 'Assembly Contract', color: 'bg-green-100 text-green-800' },
    time_based: { emoji: '⏰', label: 'Time-Based Contract', color: 'bg-indigo-100 text-indigo-800' },
    bounty: { emoji: '💰', label: 'Bounty Contract', color: 'bg-emerald-100 text-emerald-800' },
    game_key: { emoji: '🎮', label: 'Game Key Escrow', color: 'bg-pink-100 text-pink-800' },
    saas: { emoji: '💻', label: 'SaaS Subscription', color: 'bg-cyan-100 text-cyan-800' },
    domain_lease: { emoji: '🌐', label: 'Domain Lease', color: 'bg-teal-100 text-teal-800' },
    standard_escrow: { emoji: '🔒', label: 'Standard Escrow', color: 'bg-gray-100 text-gray-800' }
  };
  
  const config = typeConfig[contractType as keyof typeof typeConfig] || typeConfig.standard_escrow;
  
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} mb-2`}>
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </div>
  );
}

export async function streamRunnableUI({ chat_history, input }: { chat_history?: BaseMessage[], input: string }) {
  const graph = nodegraph();
  let currentNodeName = '';
  
  try {
    const stream = await graph.stream({ 
      input,
      chat_history,
    },{
      streamMode:"updates",
    },);

    const ui = createStreamableUI();
    const hasError = false;

    for await (const value of stream) {
      for (const [nodeName, values] of Object.entries(value)) {
        currentNodeName = nodeName;
        
        // Enhanced loading indicator with node-specific messages
        if (nodeName === 'initial_node') {
          ui.append(
            <div className="flex items-center space-x-2 animate-pulse">
              <div className="bg-blue-300 rounded-md p-2 w-6 h-6"></div>
              <span className="text-sm text-gray-600">Analyzing your request...</span>
            </div>
          );
        }
        
        if (nodeName === 'escrow_node') {
          ui.update(
            <div className="flex items-center space-x-2 animate-pulse">
              <div className="bg-green-300 rounded-md p-2 w-6 h-6"></div>
              <span className="text-sm text-gray-600">Generating smart contract...</span>
            </div>
          );
        }
        
        if (nodeName === 'contribute_node') {
          ui.update(
            <div className="flex items-center space-x-2 animate-pulse">
              <div className="bg-purple-300 rounded-md p-2 w-6 h-6"></div>
              <span className="text-sm text-gray-600">Processing your contribution...</span>
            </div>
          );
        }

        if (nodeName !== 'end') {
          // Handle result messages with enhanced formatting
          if ((values as { result?: string }).result) {
            const result = (values as { result: string }).result;
            ui.update(<AIMessageText content={result} />);
          }
       
          // Enhanced contract display with type detection
          if (nodeName === 'escrow_node' && (values as any).contractData) {
            const contractCode = (values as any).contractData as string;
            const contractType = getContractType(contractCode);
            
            console.log('Contract data:', contractCode);
            console.log('Detected contract type:', contractType);
            
            ui.append(
              <div className="space-y-2">
                <ContractTypeIndicator contractType={contractType} />
                <SmartContractDisplay contractCode={contractCode} />
              </div>
            );
          }
          
          // Handle contribution responses
          if (nodeName === 'contribute_node' && (values as { result?: string }).result) {
            ui.append(
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span className="text-green-800 font-medium">Contribution Received</span>
                </div>
                <p className="text-green-700 mt-1 text-sm">
                  Thank you for your contribution! Our team will review it shortly.
                </p>
              </div>
            );
          }
        }
      }
    }

    ui.done();
    return { ui: ui.value };
    
  } catch (error) {
    console.error('Error in streamRunnableUI:', error);
    const ui = createStreamableUI();
    
    ui.update(
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-600 mr-2">❌</span>
          <span className="text-red-800 font-medium">Processing Error</span>
        </div>
        <p className="text-red-700 mt-1 text-sm">
          Sorry, there was an error processing your request. Please try again or contact support.
        </p>
        <details className="mt-2 text-xs text-red-600">
          <summary>Technical Details</summary>
          <p>Node: {currentNodeName}</p>
          <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </details>
      </div>
    );
    
    ui.done();
    return { ui: ui.value };
  }
}

export function exposeEndpoints<T extends Record<string, unknown>>(
  actions: T,
): {
  (props: { children: ReactNode }): Promise<JSX.Element>;
  $$types?: T;
} {
  return async function AI(props: { children: ReactNode }) {
    return <AIProvider actions={actions}>{props.children}</AIProvider>;
  };
}
