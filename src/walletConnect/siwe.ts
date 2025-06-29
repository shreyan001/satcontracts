import {
    createSIWEConfig,
    SIWECreateMessageArgs,
    formatMessage,
    SIWESession,
    SIWEVerifyMessageArgs,
  } from '@web3modal/siwe';
  import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
  import { getCsrfToken, getSession, signIn, signOut } from 'next-auth/react';
  import { cookieStorage, createStorage } from 'wagmi';
  import { createPublicClient, http, defineChain } from 'viem';

  // Get projectId from https://cloud.walletconnect.com
  export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  
  if (!projectId) throw new Error('Project ID is not defined');

  // Define Citrea Testnet custom chain
  export const citreaTestnet = defineChain({
    id: 5115,
    name: 'Citrea Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Citrea Bitcoin',
      symbol: 'cBTC',
    },
    rpcUrls: {
      default: { http: ['https://rpc.testnet.citrea.xyz'] },
    },
    blockExplorers: {
      default: { 
        name: 'Citrea Explorer', 
        url: 'https://explorer.testnet.citrea.xyz' 
      },
    },
    testnet: true,
  });
  
  export const metadata = {
    name: 'SatContracts',
    description: 'Put your sats to work—AI-verified micro-escrow on Bitcoin’s first zk-rollup',
    url: 'https://SatContracts.vercel.app/', // origin must match your domain & subdomain
    icons: ['https://raw.githubusercontent.com/shreyan001/SatsContracts/refs/heads/main/public/logo.png'],
  };
  
  export const publicClient = createPublicClient({
    chain: citreaTestnet,
    transport: http()
  });
  // Create wagmiConfig
  const chains = [citreaTestnet] as const;
  export const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  });
  

  
  export const siweConfig = createSIWEConfig({
    getMessageParams: async () => ({
      domain: typeof window !== 'undefined' ? window.location.host : '',
      uri: typeof window !== 'undefined' ? window.location.origin : '',
      chains: [citreaTestnet.id],
      statement: 'Please sign with your account',
    }),
    createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
      formatMessage(args, address),
    getNonce: async () => {
      const nonce = await getCsrfToken();
      if (!nonce) {
        throw new Error('Failed to get nonce!');
      }
  
      return nonce;
    },
    getSession: async () => {
      const session = await getSession();
      if (!session) {
        throw new Error('Failed to get session!');
      }
  
      const { address, chainId } = session as unknown as SIWESession;
  
      return { address, chainId };
    },
    verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
      try {
        const success = await signIn('credentials', {
          message,
          redirect: false,
          signature,
          callbackUrl: '/protected',
        });
  
        return Boolean(success?.ok);
      } catch (error) {
        return false;
      }
    },
    signOut: async () => {
      try {
        await signOut({
          redirect: false,
        });
  
        return true;
      } catch (error) {
        return false;
      }
    },
  });