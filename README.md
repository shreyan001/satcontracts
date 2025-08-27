
# 🛰️ SatContracts


## Wave 5 demo video - https://jumpshare.com/s/5AgJKcWbvzl1zFzHCsnW

**Turn every satoshi into a smart contract** – AI-verified escrows for anything digital, powered by Citrea.

SatContracts allows users to create trust-minimized, automated escrow contracts using native Bitcoin (on testnet via Citrea rollup). Users can escrow sats against verifiable actions—like domain leasing, game key rentals, micro-loans, or API metering—using off-chain verification by AI agents.

---

## 🚀 Features

- 🔐 Native BTC escrows on Citrea rollup
- 🤖 AI agents (LangGraph) verify off-chain outcomes via API & browser automation
- 🧠 JSON-based contract templates (e.g. SaaS usage, game-key loans, bounty splits)
- 🪙 Micro-escrows starting from 10,000 sats
- 📸 Verifiable data proofing (screenshots, signed CID uploads)
- 📊 Live dashboard with escrow vault statuses
- 🧩 Extendable verifier nodes (one per use case)

---

## 📦 Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/satcontracts.git
   cd satcontracts
   ```

2. **Install dependencies**
   ```bash
   yarn
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory with the following content:
   ```
   NEXTAUTH_SECRET=''
   NEXT_PUBLIC_PROJECT_ID=''
   NEXT_PUBLIC_GROQ_API_KEY=""
   TOGETHER_AI_API_KEY=''
   ```
   > 🧠 You can obtain your WalletConnect `PROJECT_ID` by visiting [https://cloud.walletconnect.com](https://cloud.walletconnect.com)

4. **Start the dev server**
   ```bash
   yarn dev
   ```

---

## 🧪 How It Works

SatContracts converts natural-language agreements into verifiable smart contracts, in six steps:

1. **Chat → JSON Terms**
   LangGraph parses conversation into JSON escrow specs.

2. **Deploy Vault on Citrea**
   `EscrowFactory.sol` emits on-chain contract, hashing the JSON terms.

3. **Event Listener → Verifier Node**
   A verifier (e.g. headless browser/API module) fetches off-chain data for resolution.

4. **Oracle Data Pinned & Signed**
   Data (numeric or screenshot) is uploaded to IPFS and signed by the verifier.

5. **AI Agent Executes Contract**
   Based on rules, funds are released, partially refunded, or default to timeout logic.

6. **Dashboard & Logs**
   React front-end shows vault states streamed via Envio/SubQuery.

---

## 🌐 Escrow Use Cases

| Template              | Asset                | Verification Method              |
| --------------------- | -------------------- | -------------------------------- |
| Game-key rental       | Steam licence        | Headless login checks            |
| Domain weekend lease  | DNS record           | Cloudflare API + screenshot      |
| SaaS pay-as-you-go    | API quota            | Meter polling endpoint           |
| Gift-card flip        | Retail code          | Balance API + browser screenshot |
| Influencer bounty     | Social metrics       | X/TikTok API                     |
| Micro-loan            | BTC vs USDT          | Price feed LTV checks            |
| Hackathon prize split | Submission proofs    | Akindo GraphQL                   |
| Sports bet            | Game score           | Pull oracle                      |
| Licence rental        | Software entitlement | RDP scrape                       |

---

## 🔮 Vision: Escrows for the Real World

Bitcoin holders today mostly **store wealth**—but SatContracts lets them **use sats**:

* Use unused BTC as **collateral** in micro-loans
* Lock sats as **temporary deposits** for service usage
* Create **dynamic pay-per-use agreements** for digital subscriptions
* Participate in **global P2P rentals and trades** without relying on trust

With **LangGraph**, every verifier is just another node. Each new use case = a 200-line AI agent + 1 transaction. Simple. Modular. Scalable.

---

## 🛠️ Tech Stack

* **Next.js + Tailwind CSS** – Front-end UI
* **LangGraph + Together.ai** – AI agent logic & task routing
* **Stork / Blocksense / IPFS** – Oracle feeds & data storage
* **Citrea + Safe Wallet** – Bitcoin-native zkRollup contracts
* **WalletConnect** – User auth & wallet interactions

---

## 📅 Next Milestones

* [ ] Template UI Generator – auto-build escrow specs
* [ ] Risk Engine – fraud/anomaly detection
* [ ] Insurance Pool – optional BTC fund safety net
* [ ] Group Vaults – community escrows with yield split
* [ ] Privacy Mode – Poseidon commitments for blind bids

---

## 👥 Contributing

Pull requests, feedback, and new verifier ideas are welcome!
If you're building custom verifier templates, check out the `verifiers/` directory and follow the `template-verifier.ts` pattern.

---

## 📜 License

MIT © 2025 – SatContracts Team
