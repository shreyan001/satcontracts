
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {streamRunnableUI, exposeEndpoints} from "@/ai/server";
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