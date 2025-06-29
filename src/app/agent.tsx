import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { streamRunnableUI, exposeEndpoints } from "@/ai/server";
import nodegraph from "@/ai/graph";

const convertChatHistoryToMessages = (
  chat_history: [role: string, content: string][],
) => {
  return chat_history.map(([role, content]) => {
    switch (role) {
      case "human":
        return new HumanMessage(content);
      case "assistant":
      case "ai":
        return new AIMessage(content);
      default:
        return new HumanMessage(content);
    }
  });
};

// Determine if the query is related to time-sensitive asset verification
const isTimeAssetVerificationQuery = (input: string) => {
  const timeVerificationTerms = [
    "verify", "check", "asset", "nft", "token", "expiration", "expired", 
    "time", "blockchain", "ethereum", "polygon", "smart contract", "validation"
  ];
  
  // Check if the input contains at least two terms related to time-sensitive asset verification
  const matches = timeVerificationTerms.filter(term => 
    input.toLowerCase().includes(term.toLowerCase())
  );
  
  return matches.length >= 2;
};

async function agent(inputs: {
  chat_history: [role: string, content: string][],
  input: string;
}) {
  "use server";
  
  return streamRunnableUI({
    input: inputs.input,
    chat_history: convertChatHistoryToMessages(inputs.chat_history),
  });
}

export const EndpointsContext = exposeEndpoints({ agent });