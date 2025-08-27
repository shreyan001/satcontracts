'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Search, Wallet, ExternalLink, FileText } from 'lucide-react'
import { AIMessageText, HumanMessageText } from "@/components/ui/message"
import { EndpointsContext } from '@/app/agent'
import { useActions } from '@/ai/client'
import ConnectButton from './ui/walletButton'
import Image from 'next/image'
import PortfolioWallet from './ui/portfolioWallet'
import { useAccount } from 'wagmi'
import PreBuiltTemplates from './ui/preBuiltTemplates';

interface DeployedContract {
  id: string;
  name: string;
  contractAddress: string;
  contractType: string;
  partyA: string;
  partyB?: string;
  partyAAddress?: string;
  partyBAddress?: string;
  deployedAt: string;
  description?: string;
}

export function AgentsGuildInterface() {
  const { address, isConnected } = useAccount()
  const actions = useActions<typeof EndpointsContext>();
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<[role: string, content: string][]>([
    ["human", "Hello!"],
    ["ai", "Welcome to Agents Guild! How can I assist you today?"]
  ]);
  const [elements, setElements] = useState<JSX.Element[]>([]);
  const [userContracts, setUserContracts] = useState<DeployedContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [elements]); // This will trigger whenever elements change

  useEffect(() => {
    if (isConnected && address) {
      fetchUserContracts();
    } else {
      setUserContracts([]);
    }
  }, [isConnected, address]);

  const fetchUserContracts = async () => {
    if (!address) return;
    
    setContractsLoading(true);
    try {
      const response = await fetch('/api/contracts');
      if (response.ok) {
        const contracts: DeployedContract[] = await response.json();
        // Optimize filtering: Only show contracts where current wallet is partyA (contract deployer)
        const currentAddress = address.toLowerCase();
        const userDeployedContracts = contracts.filter(contract => {
          // Check partyA first (most common case) for better performance
          if (contract.partyA?.toLowerCase() === currentAddress) return true;
          // Fallback to partyAAddress if partyA doesn't match
          if (contract.partyAAddress?.toLowerCase() === currentAddress) return true;
          return false;
        });
        setUserContracts(userDeployedContracts);
      } else {
        console.error('Failed to fetch contracts');
        setUserContracts([]);
      }
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      setUserContracts([]);
    } finally {
      setContractsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!isConnected) {
      // Optionally, you can show a message to the user 
      
      console.log("Please connect your wallet to chat");
      return;
    }

    const newElements = [...elements];
    
    const humanMessageRef = React.createRef<HTMLDivElement>();
    const humanKey = `human-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    newElements.push(
      <div className="flex flex-col items-end w-full gap-1 mt-auto" key={humanKey} ref={humanMessageRef}>
        <HumanMessageText content={input} />
      </div>
    );
    
    setElements(newElements);
    setInput("");

    // Scroll to the human message
    setTimeout(() => {
      humanMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    const element = await actions.agent({
      chat_history: history,
      input: input
    });

    const aiMessageRef = React.createRef<HTMLDivElement>();
    const aiKey = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setElements(prevElements => [
      ...prevElements,
      <div className="flex flex-col gap-1 w-full max-w-fit mr-auto" key={aiKey} ref={aiMessageRef}>
        {element.ui}
      </div>
    ]);

    // Scroll to show the top of the AI message
    setTimeout(() => {
      aiMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      <nav className="flex justify-between items-center p-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Image src="/logo.png" alt="Agents Guild Logo" width={35} height={35} />
          <span className="text-xl font-bold">SatContracts</span>
        </div>
       <ConnectButton/>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[30%] bg-[#d47615] text-black p-4 flex flex-col">
          <h1 className="text-3xl font-bold mb-6">SatContracts Dashboard</h1>
          <div className="mb-6">
       <PortfolioWallet/>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 text-black flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Escrow Contracts
            </h2>
            <div className="bg-black p-3 rounded-lg border border-gray-700">
              {contractsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#d47615]"></div>
                  <span className="ml-2 text-gray-400 text-sm">Loading contracts...</span>
                </div>
              ) : userContracts.length > 0 ? (
                <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d47615] scrollbar-track-gray-800">
                  <div className="space-y-2 pr-1">
                    {userContracts.map((contract, index) => (
                      <div
                        key={contract.id}
                        onClick={() => window.open(`/contract/${contract.id}`, '_blank')}
                        className="bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-[#d47615] p-3 rounded-lg cursor-pointer transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-white font-medium text-sm group-hover:text-[#d47615] transition-colors">
                                {contract.name}
                              </h3>
                              <span className="text-xs bg-[#d47615] text-black px-2 py-0.5 rounded-full font-medium">
                                {contract.contractType}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs">
                              ID: {contract.id.slice(0, 12)}...
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(contract.deployedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-[#d47615] transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {userContracts.length > 4 && (
                    <div className="text-center pt-2 border-t border-gray-700 mt-2">
                      <span className="text-gray-400 text-xs">
                        Showing {userContracts.length} deployed contracts
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm mb-1">No contracts deployed yet</p>
                  <p className="text-gray-500 text-xs">Deploy your first contract to see it here</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <ScrollArea ref={scrollAreaRef} className="flex-grow">
            {elements.length > 0 ? (
              <div className="flex flex-col w-full gap-1 p-4">{elements}</div>
            ) : isConnected ? (
              <div className="flex h-full items-center justify-center">
                <PreBuiltTemplates />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <PreBuiltTemplates />
              </div>
            )}
          </ScrollArea>
          <div className="p-4 border-t border-gray-800">
            <div className="flex space-x-2">
              <Input
                placeholder={
                  isConnected
                    ? "Describe your project or ask a question..."
                    : "Connect wallet to chat"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && isConnected && handleSend()
                }
                className="bg-black text-white border-gray-800 rounded-md flex-grow"
                disabled={!isConnected}
              />
              <Button
                onClick={handleSend}
                className={`bg-black text-white border border-white rounded-md px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors flex items-center space-x-2 ${
                  !isConnected && "opacity-50 cursor-not-allowed"
                }`}
                disabled={!isConnected}
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}