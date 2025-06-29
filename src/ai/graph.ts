import { StateGraph } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { START, END } from "@langchain/langgraph";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";

const KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const model = new ChatGroq({
    modelName: "llama3-8b-8192",
    temperature: 0.7,
    maxTokens: 4000,
    apiKey: KEY,
});

// Simple helper functions for SatContracts
const ESCROW_TEMPLATES = [
  { name: "game-key-rental", description: "Steam game key rental with verification" },
  { name: "saas-subscription", description: "SaaS pay-as-you-go with API metering" },
  { name: "domain-lease", description: "Domain weekend lease with DNS verification" },
  { name: "gift-card-trade", description: "Gift card trading with balance verification" },
  { name: "bounty-split", description: "Freelance bounty with delivery confirmation" },
  { name: "equipment-rental", description: "Equipment rental with return verification" }
];

// Define state type for our graph
type SatContractsState = {
    input: string,
    chatHistory?: BaseMessage[],
    messages?: any[] | null,
    operation?: string,
    result?: string,
}

export default function nodegraph() {
    const graph = new StateGraph<SatContractsState>({
        channels: {
            messages: { value: (x: any[] = [], y: any[] = []) => x.concat(y) },
            input: { value: null },
            result: { value: null },
            chatHistory: { value: null },
            operation: { value: null }
        }
    });

    // Initial Node: Routes user requests to the appropriate node
    graph.addNode("initial_node", async (state: SatContractsState) => {
        const SYSTEM_TEMPLATE = `You are an AI agent for SatContracts, a revolutionary platform that transforms human chat into structured smart contracts on Bitcoin. SatContracts creates programmable escrow agreements for digital goods, services, rentals, and micro-loans using Bitcoin as collateral.

SatContracts enables:
- Micro-escrows for trades, rentals, and gig work
- Collateral-based agreements (deposits, gift card trades, equipment lending)
- Trustless deals validated by APIs and browser agents
- Templates for game keys, SaaS subscriptions, domain leases, gift cards, bounties, and more

Currently, you can perform these main functions:
1. "contract_creation" - Parse chat conversations into structured escrow contract terms
2. "template_selection" - Help users choose the right escrow template for their needs
3. "general_info" - Provide information about SatContracts and how it works

Based on the user's input, respond with ONLY ONE of the following words:
- "contract_creation" if the user wants to create a new escrow contract or agreement
- "template_selection" if the user wants help choosing an escrow template
- "general_info" if the user wants to learn about SatContracts or how it works
- "unknown" if the request doesn't fit into any of the above categories

Respond strictly with ONLY ONE of these words. Provide no additional text or explanation.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        const response = await prompt.pipe(model).invoke({ input: state.input || "", chat_history: state.chatHistory });

        console.log(response.content, "Initial Message");

        const content = response.content as string;
        if (content.includes("contract_creation")) {
            return { messages: [response.content], operation: "contract_creation" };
        } else if (content.includes("template_selection")) {
            return { messages: [response.content], operation: "template_selection" };
        } else if (content.includes("general_info")) {
            return { messages: [response.content], operation: "general_info" };
        } else {
            const CONVERSATIONAL_TEMPLATE = `You are an AI assistant for SatContracts, a revolutionary platform that transforms human chat into structured smart contracts on Bitcoin.

SatContracts enables programmable trust for Bitcoin holders through:
- Micro-escrows for trades, rentals, and gig work
- Collateral-based agreements using BTC as security bonds
- Trustless deals validated by APIs and browser agents
- Pre-built templates for common use cases

Our platform offers:
1. Contract creation - Turn conversations into structured escrow agreements
2. Template library - Choose from game keys, SaaS, domains, gift cards, bounties, and more

Real-world use cases include:
- Game key rentals with Steam verification
- SaaS subscriptions with API token metering
- Domain weekend leases with DNS verification
- Gift card trading with balance verification
- Freelance bounties with delivery confirmation
- Equipment rentals with return verification

SatContracts transforms unused Bitcoin into programmable collateral for real-world agreements. Every satoshi becomes usable as a trust primitive without needing centralized platforms or wrapped tokens.

If you need help with Bitcoin escrow contracts or want to make your BTC work as programmable collateral, I'm here to help! What would you like to do?`;

            const conversationalPrompt = ChatPromptTemplate.fromMessages([
                ["system", CONVERSATIONAL_TEMPLATE],
                new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
                ["human", "{input}"]
            ]);

            const conversationalResponse = await conversationalPrompt.pipe(model).invoke({ 
                input: state.input || "", 
                chat_history: state.chatHistory 
            });

            return { 
                result: conversationalResponse.content as string, 
                messages: [conversationalResponse.content] 
            };
        } 
    });

    // Contract Creation Node
    graph.addNode("contract_creation_node", async (state: SatContractsState) => {
        console.log("Processing contract creation request");

        const CONTRACT_CREATION_TEMPLATE = `You are an AI agent for SatContracts that specializes in parsing human conversations into structured escrow contract terms.

Your job is to analyze the user's request and extract the key components of an escrow agreement:

1. **Escrow Type**: What kind of agreement is this? (rental, trade, bounty, etc.)
2. **Parties**: Who are the participants?
3. **Asset/Service**: What is being exchanged or provided?
4. **Collateral**: How much Bitcoin collateral is required?
5. **Duration**: How long does the agreement last?
6. **Verification Method**: How will completion/delivery be verified?
7. **Terms**: Any specific conditions or requirements?

Based on the user's input, provide a structured summary of the proposed escrow contract in a clear, conversational way. If any crucial information is missing, ask clarifying questions.

Remember: SatContracts uses Bitcoin as collateral for trustless agreements, with automated verification through APIs, browser agents, and oracles.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", CONTRACT_CREATION_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        const response = await prompt.pipe(model).invoke({ 
            input: state.input || "", 
            chat_history: state.chatHistory 
        });

        return {
            result: response.content as string,
            messages: [response.content]
        };
    });

    // Template Selection Node
    graph.addNode("template_selection_node", async (state: SatContractsState) => {
        console.log("Processing template selection request");

        const TEMPLATE_SELECTION_TEMPLATE = `You are an AI agent for SatContracts that helps users choose the right escrow template for their needs.

Available SatContracts Templates:

🎮 **Game Key Rental**
- Steam game key rental with verification
- Automated Steam login verification
- Perfect for temporary game access

💻 **SaaS Subscription** 
- Pay-as-you-go with API metering
- Usage-based billing verification
- Ideal for software services

🌐 **Domain Lease**
- Weekend/short-term domain leasing
- DNS verification system
- Great for temporary websites

🎁 **Gift Card Trade**
- Gift card trading with balance verification
- Automated balance checking
- Secure card exchanges

💰 **Bounty Split**
- Freelance work with delivery confirmation
- GitHub/delivery verification
- Multi-party reward distribution

🔧 **Equipment Rental**
- Physical equipment rental agreements
- Return verification system
- Damage protection through collateral

Based on the user's request, recommend the most suitable template(s) and explain why. If their use case doesn't fit existing templates, suggest how we could create a custom escrow structure.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", TEMPLATE_SELECTION_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        const response = await prompt.pipe(model).invoke({ 
            input: state.input || "", 
            chat_history: state.chatHistory 
        });

        return {
            result: response.content as string,
            messages: [response.content]
        };
    });

    // General Info Node
    graph.addNode("general_info_node", async (state: SatContractsState) => {
        console.log("Processing general info request");

        const GENERAL_INFO_TEMPLATE = `You are an AI assistant for SatContracts. Provide helpful information about our platform based on the user's question.

**About SatContracts:**
SatContracts is a revolutionary platform that transforms human chat into structured smart contracts on Bitcoin. We enable programmable trust for Bitcoin holders through micro-escrows and collateral-based agreements.

**Key Features:**
- Chat-to-contract conversion using AI
- Bitcoin-native escrow agreements on Citrea zkRollup
- Automated verification through APIs and browser agents
- Pre-built templates for common use cases
- Trustless agreements without centralized platforms

**How It Works:**
1. Users describe their agreement in natural language
2. AI parses the conversation into structured contract terms
3. Smart contract deploys on Citrea with Bitcoin collateral
4. Automated verifiers monitor agreement conditions
5. Funds release based on verification results

**Use Cases:**
- Game key rentals, SaaS subscriptions, domain leases
- Gift card trading, freelance bounties, equipment rentals
- Any agreement where Bitcoin can serve as programmable collateral

**Benefits:**
- Makes unused Bitcoin productive as collateral
- Eliminates need for trusted intermediaries
- Enables micro-transactions as small as 10,000 sats
- Automated verification reduces disputes

Answer the user's question about SatContracts in a helpful and informative way.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", GENERAL_INFO_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        const response = await prompt.pipe(model).invoke({ 
            input: state.input || "", 
            chat_history: state.chatHistory 
        });

        return {
            result: response.content as string,
            messages: [response.content]
        };
    });

    // Connect nodes
    //@ts-ignore
    graph.addEdge(START, "initial_node");
    
    //@ts-ignore
    graph.addConditionalEdges("initial_node",
        async (state) => {
            if (!state.messages || state.messages.length === 0) {
                console.error("No messages in state");
                return "end";
            }

            if (state.operation === "contract_creation") {
                return "contract_creation";
            } else if (state.operation === "template_selection") {
                return "template_selection";
            } else if (state.operation === "general_info") {
                return "general_info";
            } else if (state.result) {
                return "end";
            }
            
            return "end";
        },
        {
            contract_creation: "contract_creation_node",
            template_selection: "template_selection_node",
            general_info: "general_info_node",
            end: END,
        }
    );

    // Connect nodes to END
    //@ts-ignore    
    graph.addEdge("contract_creation_node", END);
    //@ts-ignore
    graph.addEdge("template_selection_node", END);
    //@ts-ignore
    graph.addEdge("general_info_node", END);

    const data = graph.compile();
    return data;
}