import { createStreamableUI } from 'ai/rsc';
import nodegraph from './graph';
import { AIMessageText, HumanMessageText } from "@/components/ui/message";
import { ReactNode } from 'react';
import { AIProvider } from './client';
import { BaseMessage } from '@langchain/core/messages';


export async function streamRunnableUI({ chat_history, input }: { chat_history?: BaseMessage[], input: string }) {
  const graph = nodegraph();
  const stream = await graph.stream({ 
    input,
    chat_history,
  },{
    streamMode:"updates",
  },);

  const ui = createStreamableUI();

  for await (const value of stream) {
    for (const [nodeName, values] of Object.entries(value)) {
      // Add a loading indicator when the stream starts
      if (nodeName === 'initial_node') {
        ui.append(<div className="animate-pulse bg-gray-300 rounded-md p-2 w-24 h-6"></div>);
      }
      
      if (nodeName !== 'end') {
        // Handle text results
        if ((values as { result?: string }).result) {
          ui.update(<AIMessageText content={(values as { result: string }).result} />);
        }
        
        // Handle wallet verification results
        if (nodeName === 'wallet_verification_node' && (values as any).walletData) {
          const walletData = (values as any).walletData;
          const verificationResult = (values as any).verificationResult;
          
          if (verificationResult && verificationResult.success) {
            ui.append(
              <div className="mt-4 p-4 bg-gray-100 rounded-md border border-gray-300">
                <h3 className="font-semibold">Wallet Information</h3>
                <div className="mt-2 text-sm">
                  <div><span className="font-medium">Address:</span> {walletData.address}</div>
                  <div><span className="font-medium">Protocol:</span> {walletData.protocol}</div>
                  <div><span className="font-medium">Network:</span> {walletData.network}</div>
                  <div className="mt-2">
                    <span className="font-medium">Status:</span>{" "}
                    <span className="text-green-600 font-semibold">Verified ✓</span>
                  </div>
                </div>
              </div>
            );
          }
        }
        
        // Handle NFT verification results
        if (nodeName === 'nft_verification_node' && (values as any).nftData) {
          const nftData = (values as any).nftData;
          const verificationResult = (values as any).verificationResult;
          
          if (verificationResult && verificationResult.success) {
            ui.append(
              <div className="mt-4 p-4 bg-gray-100 rounded-md border border-gray-300">
                <h3 className="font-semibold">NFT Information</h3>
                <div className="mt-2 text-sm">
                  <div><span className="font-medium">Contract:</span> {nftData.contractAddress}</div>
                  <div><span className="font-medium">Protocol:</span> {nftData.protocol}</div>
                  <div><span className="font-medium">Network:</span> {nftData.network}</div>
                  {nftData.tokenId && (
                    <div><span className="font-medium">Token ID:</span> {nftData.tokenId}</div>
                  )}
                  <div className="mt-2">
                    <span className="font-medium">Status:</span>{" "}
                    <span className="text-green-600 font-semibold">Verified ✓</span>
                  </div>
                </div>
              </div>
            );
          }
        }
      }
    }
  }

  ui.done();
  return { ui: ui.value };
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
