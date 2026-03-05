# Trust Ops Agent

A decentralized AI validation platform that uses multi-worker consensus to verify AI-generated outputs on the Sui blockchain.

## Overview

Trust Ops Agent provides transparent, consensus-driven verification of AI outputs through a multi-worker validation system. The platform leverages real LLM APIs to generate diverse responses, analyzes semantic similarity, and mints NFT certificates for validated prompts that achieve consensus.

### Key Features

- Multi-worker AI validation with distinct reasoning styles (Technical, Practical, Analytical)
- Real-time LLM integration via Groq API (Llama 3.3 70B)
- Semantic similarity analysis using N-gram and conceptual overlap
- Trust score calculation (0-100) across four weighted components
- NFT certificate minting on Sui Mainnet for validated outputs
- Production-ready infrastructure with Railway backend hosting

## Architecture

### System Components

**Backend (Express + TypeScript)**
- API server handling validation requests and worker orchestration
- Parallel worker execution for sub-2-second response times
- Semantic similarity engine with multi-layer analysis
- Z-score based outlier detection
- Exponential backoff retry mechanism for API reliability

**Frontend (Next.js + React)**
- Wallet integration via @mysten/dapp-kit
- Real-time validation progress tracking
- Interactive trust score visualization
- NFT certificate preview and minting interface

**Smart Contract (Move Language)**
- Deployed on Sui Mainnet
- NFT certificate minting with Display standard
- 0.1 USDC minting fee
- On-chain metadata storage

**LLM Integration (Groq API)**
- Three worker personas with distinct system prompts
- Parallel request execution
- Graceful degradation to simulation mode on API failures

## Technical Stack

- **Blockchain**: Sui Mainnet
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Next.js 14, React, Tailwind CSS
- **LLM Provider**: Groq (Llama 3.3 70B Versatile)
- **Smart Contract**: Move Language
- **Deployment**: Railway (Backend), Vercel (Frontend)
- **Wallet Integration**: Sui Wallet via @mysten/dapp-kit

## Trust Score Algorithm

The trust score (0-100) is calculated using four weighted components:

1. **Semantic Similarity (0-60 points)**: Multi-layer N-gram analysis and conceptual overlap
2. **Consensus Ratio (0-20 points)**: Z-score outlier detection with 2-sigma threshold
3. **Time Consistency (0-10 points)**: Response quality and timing metrics
4. **Worker Reputation (0-10 points)**: Contradiction detection across workers

Consensus threshold: 70/100

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Sui CLI
- Sui wallet with mainnet SUI tokens

### Backend Setup
```bash
cd Trust-Ops-Agent
npm install
cp .env.example .env
```

Configure environment variables in `.env`:
```
SUI_NETWORK=mainnet
PACKAGE_ID=0xef4bc4b793364d91434e824d180ec61459f2d393cf699820562c97ee49335447
PORT=3000
BACKEND_URL=https://your-backend-url.com
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend:
```bash
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
```

Configure environment variables in `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

Start the frontend:
```bash
npm run dev
```

Access at: http://localhost:3001

### Smart Contract Deployment
```bash
cd move
sui move build
sui client publish --gas-budget 80000000
```

Update `PACKAGE_ID` in backend `.env` with the deployed package ID.

## API Endpoints

### POST /api/infer
Submit a prompt for multi-worker validation.

**Request Body:**
```json
{
  "prompt": "What is machine learning?",
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "validationId": "val_123...",
  "status": "processing"
}
```

### POST /api/validate
Retrieve validation results and trust score.

**Request Body:**
```json
{
  "validationId": "val_123..."
}
```

**Response:**
```json
{
  "validationId": "val_123...",
  "trustScore": 87,
  "consensusReached": true,
  "breakdown": {
    "semanticSimilarity": 55,
    "consensusRatio": 20,
    "timeConsistency": 10,
    "workerReputation": 10
  },
  "evidenceBundle": {
    "ipfsCid": "Qm...",
    "workerCount": 3,
    "avgSimilarity": 22,
    "outlierCount": 0
  }
}
```

### POST /api/mint-certificate
Generate transaction data for NFT minting.

**Request Body:**
```json
{
  "validationId": "val_123...",
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "needsBuild": true,
  "transactionData": {
    "target": "0x...::trust_certificate::mint_certificate",
    "arguments": { ... }
  }
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "llmProvider": "Groq Llama",
  "network": "mainnet",
  "packageId": "0x..."
}
```

## Production Deployment

### Backend (Railway)

1. Connect GitHub repository to Railway
2. Configure environment variables
3. Deploy automatically on push

### Frontend (Vercel)

1. Import GitHub repository
2. Set Root Directory to `frontend`
3. Configure environment variables
4. Deploy

### Smart Contract

Contract deployed at:
```
Package ID: 0xef4bc4b793364d91434e824d180ec61459f2d393cf699820562c97ee49335447
Network: Sui Mainnet
```

## Usage

1. Connect Sui wallet to the application
2. Enter a prompt or question for validation
3. Wait for multi-worker consensus analysis (1-2 seconds)
4. Review trust score and breakdown
5. If consensus reached (score >= 70), mint NFT certificate for 0.1 USDC

## Performance Metrics

- Validation Response Time: <2 seconds
- Best Validation Score: 95/100
- Average Consensus Score: 87/100
- API Success Rate: >95% (with retry logic)

## Smart Contract Functions

### mint_certificate

Mints an NFT certificate for validated outputs.
```move
public fun mint_certificate<T>(
    payment: Coin<T>,
    validation_id: vector<u8>,
    trust_score: u8,
    ipfs_cid: vector<u8>,
    prompt: vector<u8>,
    timestamp: u64,
    recipient: address,
    ctx: &mut TxContext
)
```

Parameters:
- `payment`: 0.1 USDC payment coin
- `validation_id`: Unique validation identifier
- `trust_score`: Score from 0-100
- `ipfs_cid`: IPFS hash of evidence bundle
- `prompt`: Original validated prompt
- `timestamp`: Validation timestamp
- `recipient`: Address to receive NFT
- `ctx`: Transaction context

## Security Considerations

- All API calls include retry logic and error handling
- Worker responses validated for contradictions
- Z-score outlier detection prevents manipulation
- On-chain metadata immutable after minting
- Payment verification enforced in smart contract

## Roadmap

### Q1 2026
- Complete frontend deployment to Vercel
- Add monitoring dashboard and analytics
- Implement comprehensive error tracking

### Q2 2026
- Additional LLM provider integration (Anthropic, OpenAI)
- Batch validation API
- Public REST API with authentication
- Validation history dashboard

### Q3-Q4 2026
- On-chain worker reputation system
- Custom worker pools for specialized domains
- Multi-chain expansion
- Enterprise partnerships

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary software. All rights reserved.

## Contact

- GitHub: https://github.com/muizcal/Trust-Ops-Agent
- Backend: https://trust-ops-agent-production.up.railway.app

## Acknowledgments

- Sui Foundation for blockchain infrastructure
- Groq for LLM API access
- Anthropic for Claude assistance in development
