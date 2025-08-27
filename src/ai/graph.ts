import { ethers } from "ethers";
import { StateGraph } from "@langchain/langgraph";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import { START, END } from "@langchain/langgraph";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { systemPrompt } from "./contractTemplate";
import { ChatOpenAI } from "@langchain/openai";
import { fetchboxPrompt } from "./fetchbox"
import { contractsArray } from "@/lib/contractIndex";
import fs from 'fs/promises';
import path from 'path';


const model = new ChatGroq({
    modelName: "llama3-8b-8192",
    temperature: 0.7,
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

type guildState = {
    input: string,
    contractData?: string | null,
    chatHistory?: BaseMessage[],
    messages?: any[] | null,
    operation?: string,
    result?: string,
}

export default function nodegraph() {
    const graph = new StateGraph<guildState>({
        channels: {
            messages: { value: (x: any[], y: any[]) => x.concat(y) },
            input: { value: null },
            result: { value: null },
            contractData: { value: null },
            chatHistory: { value: null },
            operation: { value: null }
        }
    });

    // Initial Node: Routes user requests to the appropriate node
    graph.addNode("initial_node", async (state: guildState) => {
        const SYSTEM_TEMPLATE = `You are an AI agent for SatContracts, a revolutionary platform that transforms human chat into structured smart contracts. SatContracts creates programmable escrow agreements for digital goods, services, rentals, micro-loans, and social wagering.

Currently, SatContracts supports:
- CBTC to ERC20 token exchanges with secure escrow on Citrea zkRollup
- NFT to CBTC trading with automated verification and Bitcoin collateral
- Social wager contracts for betting, predictions, and competitive agreements
- Multi-party escrow agreements with programmable conditions
- Time-based and event-based conditional escrows

Expanded capabilities for hackathon demonstration:
- Bitcoin-native escrow agreements leveraging Citrea's zkRollup technology
- Social wagering platform with trustless bet resolution and automated payouts
- Cross-chain asset exchanges between Bitcoin and Ethereum ecosystems
- Micro-escrows for trades, rentals, and gig work using Bitcoin as collateral
- Collateral-based agreements with CBTC as security bonds
- Trustless deals validated by APIs and browser agents
- Templates for game keys, SaaS subscriptions, domain leases, gift cards, bounties, and equipment rentals
- Making unused Bitcoin productive as programmable collateral for real-world agreements
- ARC-20 token integration for Bitcoin-based token economies
- Complex assembly contracts for multi-step transactions and conditional logic

Based on the user's input, respond with ONLY ONE of the following words:
- "contribute_node" if the user wants to report any errors or contribute to the project
- "escrow_Node" if the request is related to creating escrow smart contracts.
- "unknown" if the request doesn't fit into any of the above categories

Context for decision-making:
- Escrow smart contracts involve secure peer-to-peer exchanges between various assets like ETH, ERC20 tokens, and NFTs.
- The platform supports multiple types of smart contract exchanges with automated verification and trustless execution.
- User contributions can include reporting errors, suggesting improvements, or offering to help develop the project.

Respond strictly with ONLY ONE of these words: "contribute_node", "escrow_Node", or "unknown". Provide no additional text or explanation.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        const response = await prompt.pipe(model).invoke({ input: state.input, chat_history: state.chatHistory });

        console.log(response.content, "Initial Message");

        const content = response.content as string;
        if (content.includes("contribute_node")) {
            return { messages: [response.content], operation: "contribute_node" };
        } else if (content.includes("escrow_Node")) {
            return { messages: [response.content], operation: "escrow_Node" };
        } else if (content.includes("unknown")) {
            const CONVERSATIONAL_TEMPLATE = `You are an AI assistant for SatContracts, a revolutionary platform that transforms human chat into structured smart contracts. SatContracts creates programmable escrow agreements for digital goods, services, rentals, and micro-loans.

            Key Features:
            - Smart Contract Generation: Transform natural language conversations into secure escrow smart contracts
            - Multi-Asset Support: Currently supports ETH, ERC20 tokens, and NFT exchanges with automated verification
            - User Interaction: Conversational interface for creating complex escrow agreements without technical knowledge
            - Security Focus: All contracts include built-in verification and trustless execution mechanisms
            - Future Bitcoin Integration: Planned support for Bitcoin-native escrow on Citrea zkRollup

            Current Capabilities:
            - ETH to ERC20, NFT to ETH, NFT to ERC20, NFT to NFT, and ERC20 to ERC20 exchanges
            - Automated contract deployment with security verification
            - Real-time chat-to-contract conversion using AI

            Future Possibilities:
            - Bitcoin collateral-based agreements for micro-transactions
            - Templates for game keys, SaaS subscriptions, domain leases, and more
            - API and browser agent verification for real-world use cases

            If the user's request is unrelated to our services, politely explain that we cannot process their request and suggest something related to SatContracts that they might find interesting. Always maintain a friendly and helpful tone, and don't give long responses; keep it short or medium length and concise in markdown format.`;

            const conversationalPrompt = ChatPromptTemplate.fromMessages([
                ["system", CONVERSATIONAL_TEMPLATE],
                new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
                ["human", "{input}"]
            ]);
            const summaryModel = model.withConfig({ runName: "Summarizer" });
            const conversationalResponse = await conversationalPrompt.pipe(summaryModel).invoke({ input: state.input, chat_history: state.chatHistory });

            return { result: conversationalResponse.content as string, messages: [conversationalResponse.content] };
        } 
    });

    //@ts-ignore
    graph.addEdge(START, "initial_node");
    //@ts-ignore
    graph.addConditionalEdges("initial_node",
        async (state) => {
            if (!state.messages || state.messages.length === 0) {
                console.error("No messages in state");
                return "end";
            }

            if (state.operation === "contribute_node") {
                return "contribute_node";
            } else if (state.operation === "escrow_Node") {
                return "escrow_node";
            } else if (state.result) {
                return "end";
            }
        },
        {
            contribute_node: "contribute_node",
            escrow_node: "escrow_node",
            end: END,
        }
    );

    // Add the contribute_node
    graph.addNode("contribute_node", async (state: guildState) => {
        console.log("Processing contribution or error report");

        const CONTRIBUTE_TEMPLATE = `You are an AI assistant for SatContracts, tasked with processing user contributions and error reports. Your job is to analyze the user's input and create a structured JSON response containing the following fields:

        - type: Either "error_report" or "code_contribution"
        - description: A brief summary of the error or contribution
        - details: More detailed information about the error or contribution
        - impact: Potential impact of the error or the benefit of the contribution
        - priority: Suggested priority (low, medium, high)

        Based on the user's input, create a JSON object with these fields. Be concise but informative in your responses.`;

        const contributePrompt = ChatPromptTemplate.fromMessages([
            ["system", CONTRIBUTE_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        try {
            const response = await contributePrompt.pipe(model).invoke({ 
                input: state.input, 
                chat_history: state.chatHistory
            });

            const contributionData = JSON.parse(response.content as string);

            // Save the contribution data to a file
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const fileName = `contribution_${timestamp}.json`;
            const filePath = path.join(process.cwd(), 'contributions', fileName);

            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(contributionData, null, 2));

            return { 
                result: "Thank you for your contribution. Your response has been received successfully and will be reviewed by our team.",
                messages: [response.content]
            };
        } catch (error) {
            console.error("Error in contribute_node:", error);
            return { 
                result: "Your error has been received successfully and will be reviewed by our team.",
                messages: ["Error processing contribution"]
            };
        }
    });

    // Add the Escrow_Node
    graph.addNode("escrow_node", async (state: guildState) => {
        console.log("Generating Escrow contract");

        // Ensure this is a string
        const FetchboxPrompt = ChatPromptTemplate.fromMessages([
            ["system", fetchboxPrompt],
            ["human", "{input}"]
        ]);

        const fetchboxResponse = await FetchboxPrompt.pipe(model).invoke({ input: state.input });
        
        let index: number | string;
        let context: any;
        if (!isNaN(Number(fetchboxResponse.content))) {
            index = parseInt(fetchboxResponse.content as string, 10);
        } else {
            index = fetchboxResponse.content as string;
        }
        
        if (typeof index === 'number' && !isNaN(index)) {
            context = contractsArray[index].contract_code;
        } else {
            context = index;
        }

        // Directly return the contract without AI processing
        if (typeof index === 'number' && !isNaN(index) && contractsArray[index]) {
            const selectedContract = contractsArray[index];
            const contractExplanation = `## ${selectedContract.name}\n\n**Description:** ${selectedContract.description}\n\n**Category:** ${selectedContract.category}\n\nThis contract provides secure escrow functionality for peer-to-peer transactions. Below is the complete smart contract code:`;
            
            return {
                contractData: selectedContract.contract_code,
                result: contractExplanation,
                messages: [contractExplanation]
            };
        } else {
            return {
                result: "Welcome to SatContracts! I can help you create secure escrow contracts on Citrea.",
                messages: ["I specialize in creating escrow contracts for various asset exchanges like CBTC to NFT, NFT to ERC20, NFT to NFT, and ERC20 to ERC20 transfers. What type of escrow would you like to set up?"]
            };
        }
    });

    //@ts-ignore    
    graph.addEdge("contribute_node", END);
    //@ts-ignore
    graph.addEdge("escrow_node", END);

    const data = graph.compile();
    return data;
}