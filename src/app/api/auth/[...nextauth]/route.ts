import NextAuth from 'next-auth';
import credentialsProvider from 'next-auth/providers/credentials';
import {
  type SIWESession,
  verifySignature,
  getChainIdFromMessage,
  getAddressFromMessage,
} from '@web3modal/siwe';
import { citreaTestnet, parseChainId } from '@/walletConnect/siwe';

declare module 'next-auth' {
  interface Session extends SIWESession {
    address: string;
    chainId: number;
  }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is not set');
}

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not set');
}

const providers = [
  credentialsProvider({
    name: 'Ethereum',
    credentials: {
      message: {
        label: 'Message',
        type: 'text',
        placeholder: '0x0',
      },
      signature: {
        label: 'Signature',
        type: 'text',
        placeholder: '0x0',
      },
    },
    async authorize(credentials) {
      try {
        if (!credentials?.message) {
          throw new Error('SiweMessage is undefined');
        }
        const { message, signature } = credentials;
        const address = getAddressFromMessage(message);
        const chainId = getChainIdFromMessage(message);

        // Extract numeric chain ID from EIP-155 format (e.g., "eip155:5115" -> 5115)
        const numericChainId = parseChainId(chainId);

        // Validate that the chain ID matches Citrea Testnet
        if (numericChainId !== citreaTestnet.id) {
          console.error(`Invalid chain ID. Expected: ${citreaTestnet.id}, Got: ${chainId} (parsed: ${numericChainId})`);
          return null;
        }

        const isValid = await verifySignature({
          address,
          message,
          signature,
          chainId,
          projectId,
        });

        if (isValid) {
          return {
            id: `${numericChainId}:${address}`,
          };
        }

        return null;
      } catch (e) {
        console.error('Authorization failed:', e);
        return null;
      }
    },
  }),
];

const handler = NextAuth({
  // https://next-auth.js.org/configuration/providers/oauth
  secret: nextAuthSecret,
  providers,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    session({ session, token }) {
      if (!token.sub) {
        return session;
      }

      const [, chainId, address] = token.sub.split(':');
      if (chainId && address) {
        session.address = address;
        session.chainId = parseInt(chainId, 10);
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };