'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Search, Wallet } from 'lucide-react'
import { AIMessageText, HumanMessageText } from "@/components/ui/message"
import { EndpointsContext } from '@/app/agent'
import { useActions } from '@/ai/client'
import ConnectButton from './ui/walletButton'
import Image from 'next/image'
import PortfolioWallet from './ui/portfolioWallet'
import { useAccount } from 'wagmi'
import PreBuiltTemplates from './ui/preBuiltTemplates';

export function AgentsGuildInterface() {
  const { address, isConnected } = useAccount()
  const actions = useActions<typeof EndpointsContext>();
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<[role: string, content: string][]>([
    ["human", "Hello!"],
    ["ai", "Welcome to Agents Guild! How can I assist you today?"]
  ]);
  const [elements, setElements] = useState<JSX.Element[]>([]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [elements]); // This will trigger whenever elements change

  const handleSend = async () => {
    if (!isConnected) {
      // Optionally, you can show a message to the user here
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
            <h2 className="text-xl font-bold mb-2">Recent Escrow Contracts</h2>
            <ul className="space-y-2 bg-black p-2 rounded-md">
              {["Game Key Rental", "Domain Lease Agreement", "Gift Card Exchange"].map((project, index) => (
                <li key={index} className="bg-black text-white p-2 rounded-sm">
                  {project}
                </li>
              ))}
            </ul>here
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
                <p>Please connect your wallet to start.</p>
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