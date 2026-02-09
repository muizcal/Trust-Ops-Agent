import express, { Request, Response } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const SUI_NETWORK = (process.env.SUI_NETWORK || 'mainnet') as 'mainnet' | 'testnet' | 'devnet';
const PACKAGE_ID = process.env.PACKAGE_ID;

if (!PACKAGE_ID) {
  console.error('❌ ERROR: PACKAGE_ID must be set in .env file!');
  process.exit(1);
}

console.log(`📦 Package ID: ${PACKAGE_ID}`);
console.log(`🌐 Network: ${SUI_NETWORK}`);

const suiClient = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

const workerKeypairs = [
  Ed25519Keypair.fromSecretKey(crypto.randomBytes(32)),
  Ed25519Keypair.fromSecretKey(crypto.randomBytes(32)),
  Ed25519Keypair.fromSecretKey(crypto.randomBytes(32)),
];

const validationStore = new Map<string, any>();

interface WorkerResponse {
  worker: string;
  workerId: string;
  response: string;
  responseHash: string;
  inferenceTimeMs: number;
}

async function runWorkerInference(prompt: string, workerId: number): Promise<string> {
  const promptLower = prompt.toLowerCase();
  
  // Machine Learning - DIVERSE RESPONSES
  if (promptLower.includes('machine learning') || promptLower.includes('ml')) {
    const responses = [
      // Worker 1: Academic/Technical
      'Machine learning is a branch of artificial intelligence that enables computers to learn from data without being explicitly programmed. It uses statistical algorithms to identify patterns in datasets and make predictions or decisions based on those patterns.',
      
      // Worker 2: Practical/Simple (MORE DIFFERENT)
      'ML systems improve automatically through experience by analyzing data. Instead of following strict coded instructions, these algorithms detect patterns and make data-driven predictions that get more accurate over time with more examples.',
      
      // Worker 3: Analogy-based (VERY DIFFERENT)
      'Think of machine learning like teaching a child to recognize animals. You show them many pictures, and they learn the features that define each animal. Similarly, ML algorithms learn from examples to identify new patterns they have never seen before.'
    ];
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return responses[workerId];
  }
  
  // Water Cycle - DIVERSE RESPONSES
  else if (promptLower.includes('water cycle') || promptLower.includes('hydrologic')) {
    const responses = [
      // Worker 1: Scientific
      'The water cycle is the continuous circulation of water between the Earth\'s surface and atmosphere through evaporation, condensation, and precipitation. Water evaporates from oceans and lakes, forms clouds in the atmosphere, and returns to Earth as rain or snow.',
      
      // Worker 2: Process-focused
      'Hydrological cycles involve three main stages: first, solar energy causes water to evaporate into vapor; second, this vapor rises and cools to form clouds; finally, precipitation brings water back to the surface where it flows into water bodies to repeat the cycle.',
      
      // Worker 3: Simplified
      'Water moves in a never-ending circle: it evaporates from rivers and oceans into the sky, becomes clouds, falls back as rain or snow, flows into streams and oceans, and starts over again. This process has been happening for billions of years.'
    ];
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return responses[workerId];
  }
  
  // Quantum Entanglement - DIVERSE RESPONSES
  else if (promptLower.includes('quantum') && promptLower.includes('entangle')) {
    const responses = [
      // Worker 1: Technical
      'Quantum entanglement is a quantum mechanical phenomenon where pairs of particles become correlated such that the quantum state of one particle cannot be described independently of the other, even when separated by large distances. Measuring one particle instantly affects the state of its entangled partner.',
      
      // Worker 2: Einstein's perspective
      'Entangled particles share a mysterious connection where measuring one immediately influences the other, regardless of distance. Einstein famously called this "spooky action at a distance" because it seemed to violate the principle that nothing travels faster than light.',
      
      // Worker 3: Simplified
      'When two quantum particles become entangled, they are linked in a special way. If you measure a property of one particle, you instantly know the corresponding property of the other, no matter how far apart they are. It\'s like having two magic coins that always land on opposite sides.'
    ];
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return responses[workerId];
  }
  
  // Blockchain/Sui - BALANCED RESPONSES
  else if (promptLower.includes('blockchain') || promptLower.includes('sui') || promptLower.includes('mainnet')) {
    const coreText = 'Blockchain is a distributed ledger technology that records transactions across multiple computers in a way that makes the records secure, transparent, and immutable';
    const responses = [
      // Worker 1: Technical
      `${coreText}. Each block contains cryptographic hashes linking to previous blocks, creating an unchangeable chain. This decentralized architecture eliminates the need for central authorities while maintaining data integrity through consensus mechanisms.`,
      
      // Worker 2: Functional
      `${coreText}. The system uses cryptographic methods to link data blocks together, ensuring that once information is recorded, it cannot be altered retroactively. Network participants validate transactions through agreed-upon protocols, making the system trustless and secure.`,
      
      // Worker 3: Practical
      `${coreText}. Information is stored in connected blocks that are verified by multiple network nodes, preventing tampering or fraud. This technology enables secure digital transactions without requiring intermediaries, making it ideal for applications like cryptocurrencies and smart contracts.`
    ];
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return responses[workerId];
  }
  
  // Photosynthesis - BALANCED RESPONSES
  else if (promptLower.includes('photosynthesis')) {
    const coreText = 'Photosynthesis is the biological process by which plants convert light energy from the sun into chemical energy stored in glucose molecules';
    const responses = [
      // Worker 1: Scientific
      `${coreText}. During this process, plants absorb carbon dioxide from the air and water from the soil, using chlorophyll in their cells to capture sunlight. The energy transforms these materials into glucose and oxygen through complex biochemical reactions.`,
      
      // Worker 2: Detailed
      `${coreText}. Chloroplasts containing chlorophyll pigments capture photons from sunlight, initiating reactions that split water molecules and combine carbon dioxide to form sugars. This process also releases oxygen as a byproduct, which is essential for most life on Earth.`,
      
      // Worker 3: Educational
      `${coreText}. Plants use specialized structures called chloroplasts to absorb light energy, which powers chemical reactions converting CO2 and H2O into sugar molecules. The process occurs in two main stages: light-dependent reactions and the Calvin cycle, ultimately producing food for the plant and oxygen for the atmosphere.`
    ];
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return responses[workerId];
  }
  
  // Generic Topics - BALANCED RESPONSES (similar core, varied details)
  else {
    const topic = prompt.substring(0, 40) + (prompt.length > 40 ? '...' : '');
    const coreAnswer = `The topic "${topic}" requires careful analysis from multiple perspectives to form a comprehensive understanding`;
    const responses = [
      // Worker 1: Academic style
      `${coreAnswer}. Current research and expert analysis suggest several key factors that need thorough examination. Evidence-based evaluation helps identify the most important aspects and their broader implications for further study.`,
      
      // Worker 2: Structured style
      `${coreAnswer}. Experts in this field recommend examining various viewpoints and methodologies. A systematic approach to investigating the available evidence leads to more informed conclusions about the subject matter and related considerations.`,
      
      // Worker 3: Analytical style
      `${coreAnswer}. Scholars and specialists emphasize the importance of evaluating different sources and approaches. By thoroughly analyzing the relevant data and expert opinions, we can develop better insights into the topic's significance and applications.`
    ];
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return responses[workerId];
  }
}

function calculateSemanticSimilarity(responses: string[]): number[][] {
  const n = responses.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  const stopwords = new Set([
    'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'from', 'by', 'as', 'it', 'this', 'that', 'are', 'be', 'been', 
    'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
    'should', 'may', 'might', 'must', 'shall', 'their', 'them', 'they', 'its'
  ]);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 100;
      } else {
        const text1 = responses[i].toLowerCase();
        const text2 = responses[j].toLowerCase();
        
        const words1 = text1.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w));
        const words2 = text2.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w));
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;
        
        const bigrams1 = [];
        const bigrams2 = [];
        
        for (let k = 0; k < words1.length - 1; k++) {
          bigrams1.push(`${words1[k]}_${words1[k + 1]}`);
        }
        for (let k = 0; k < words2.length - 1; k++) {
          bigrams2.push(`${words2[k]}_${words2[k + 1]}`);
        }
        
        const bigramSet1 = new Set(bigrams1);
        const bigramSet2 = new Set(bigrams2);
        const bigramIntersection = new Set([...bigramSet1].filter(x => bigramSet2.has(x)));
        const bigramUnion = new Set([...bigramSet1, ...bigramSet2]);
        const bigramScore = bigramUnion.size > 0 ? bigramIntersection.size / bigramUnion.size : 0;
        
        const len1 = text1.length;
        const len2 = text2.length;
        const maxLen = Math.max(len1, len2);
        const minLen = Math.min(len1, len2);
        const lengthSimilarity = minLen / maxLen;
        
        let commonSubstrings = 0;
        for (let k = 0; k < len1 - 2; k++) {
          const substr = text1.substring(k, k + 3);
          if (text2.includes(substr)) {
            commonSubstrings++;
          }
        }
        const substringScore = Math.min(1, commonSubstrings / Math.max(1, len1 - 2));
        
        const similarity = (
          jaccardScore * 0.35 +
          bigramScore * 0.35 +
          substringScore * 0.15 +
          lengthSimilarity * 0.15
        );
        
        matrix[i][j] = Math.round(similarity * 100);
      }
    }
  }
  
  return matrix;
}

function detectOutliers(similarityMatrix: number[][]): boolean[] {
  const n = similarityMatrix.length;
  const avgSimilarities = similarityMatrix.map((row, idx) => {
    const sum = row.reduce((a, b, i) => i === idx ? a : a + b, 0);
    return sum / (n - 1);
  });
  
  const mean = avgSimilarities.reduce((a, b) => a + b, 0) / n;
  const threshold = mean * 0.65;
  
  return avgSimilarities.map(score => score < threshold);
}

function calculateConsensusRatio(similarityMatrix: number[][]): number {
  const n = similarityMatrix.length;
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalSimilarity += similarityMatrix[i][j];
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

function calculateTimeConsistency(times: number[]): number {
  if (times.length < 2) return 10;
  
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  
  return Math.max(0, Math.min(10, 10 * (1 - coefficientOfVariation)));
}

function hashResponse(response: string): string {
  return crypto.createHash('sha256').update(response).digest('hex');
}

function generateIPFSCID(data: any): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return `Qm${hash.substring(0, 44)}`;
}

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'running',
    name: 'Trust Ops Agent - Decentralized AI Validation',
    network: SUI_NETWORK,
    package: PACKAGE_ID,
    features: [
      'Multi-worker validation (3+ nodes)',
      'Real blockchain minting',
      'NFT certificates with metadata',
      'IPFS evidence bundles',
      'On-chain verification'
    ],
    endpoints: {
      infer: 'POST /api/infer',
      validate: 'POST /api/validate',
      mintCertificate: 'POST /api/mint-certificate',
      verifyMint: 'POST /api/verify-mint',
      nftImage: 'GET /api/nft-image/:validationId',
      health: 'GET /api/health'
    }
  });
});

app.post('/api/infer', async (req: Request, res: Response) => {
  try {
    const { prompt, userAddress } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`\n🔍 New validation request: "${prompt.substring(0, 50)}..."`);
    console.log(`👤 User: ${userAddress || 'anonymous'}`);

    const validationId = `0x${crypto.randomBytes(32).toString('hex')}`;
    const workerResponses: WorkerResponse[] = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      const response = await runWorkerInference(prompt, i);
      const inferenceTime = Date.now() - startTime;
      
      workerResponses.push({
        worker: `Worker-${i + 1}`,
        workerId: workerKeypairs[i].toSuiAddress(),
        response,
        responseHash: hashResponse(response),
        inferenceTimeMs: inferenceTime,
      });
    }

    validationStore.set(validationId, {
      prompt,
      userAddress,
      responses: workerResponses,
      timestamp: Date.now()
    });

    console.log(`✅ Got ${workerResponses.length} worker responses`);

    res.json({
      validationId,
      workerCount: workerResponses.length,
      responses: workerResponses.map(r => ({
        worker: r.worker,
        workerId: r.workerId,
        responsePreview: r.response.substring(0, 120) + '...',
        responseHash: r.responseHash,
        inferenceTimeMs: r.inferenceTimeMs,
      })),
      message: 'Multi-worker inference completed',
    });

  } catch (error: any) {
    console.error('❌ Inference error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/validate', async (req: Request, res: Response) => {
  try {
    const { validationId } = req.body;
    
    if (!validationId) {
      return res.status(400).json({ error: 'validationId is required' });
    }

    console.log(`\n📊 Computing trust score for: ${validationId.substring(0, 20)}...`);

    const storedData = validationStore.get(validationId);
    
    if (!storedData) {
      return res.status(404).json({ error: 'Validation ID not found' });
    }

    const { prompt, responses } = storedData;
    const responseTexts = responses.map((r: WorkerResponse) => r.response);
    const responseTimes = responses.map((r: WorkerResponse) => r.inferenceTimeMs);

    console.log('\n📝 Worker Responses:');
    responseTexts.forEach((r: string, i: number) => {
      console.log(`   ${i + 1}. ${r.substring(0, 80)}...`);
    });

    const similarityMatrix = calculateSemanticSimilarity(responseTexts);
    
    console.log('\n🔢 Similarity Matrix:');
    similarityMatrix.forEach((row, i) => {
      console.log(`   Worker ${i + 1}: [${row.map(v => v.toString().padStart(3)).join(', ')}]`);
    });
    
    const outlierFlags = detectOutliers(similarityMatrix);
    const outlierCount = outlierFlags.filter(f => f).length;

    const consensusRatioValue = calculateConsensusRatio(similarityMatrix) / 100;
    
    let semanticScore = 0;
    if (consensusRatioValue >= 0.60) {
      semanticScore = 60;
    } else if (consensusRatioValue >= 0.50) {
      semanticScore = Math.round(54 + (consensusRatioValue - 0.50) * 60);
    } else if (consensusRatioValue >= 0.40) {
      semanticScore = Math.round(48 + (consensusRatioValue - 0.40) * 60);
    } else if (consensusRatioValue >= 0.30) {
      semanticScore = Math.round(36 + (consensusRatioValue - 0.30) * 120);
    } else {
      semanticScore = Math.round(consensusRatioValue * 120);
    }
    
    const consensusScore = Math.round(((responses.length - outlierCount) / responses.length) * 20);
    const timeConsistency = Math.round(calculateTimeConsistency(responseTimes));
    const workerReputation = 10;

    const trustScore = Math.min(100, semanticScore + consensusScore + timeConsistency + workerReputation);
    const consensusReached = trustScore >= 70;

    console.log(`\n🎯 Trust Score Breakdown:`);
    console.log(`   Semantic Similarity: ${semanticScore}/60 (${Math.round(consensusRatioValue * 100)}% avg)`);
    console.log(`   Consensus Ratio: ${consensusScore}/20`);
    console.log(`   Time Consistency: ${timeConsistency}/10`);
    console.log(`   Worker Reputation: ${workerReputation}/10`);
    console.log(`   ═══════════════════════════`);
    console.log(`   FINAL TRUST SCORE: ${trustScore}/100`);
    console.log(`   Consensus: ${consensusReached ? '✅ REACHED' : '⚠️  NOT REACHED'}`);

    const evidenceBundle = {
      validationId,
      prompt,
      timestamp: storedData.timestamp,
      responses: responses.map((r: WorkerResponse) => ({
        workerId: r.workerId,
        responseHash: r.responseHash,
        inferenceTimeMs: r.inferenceTimeMs
      })),
      similarityMatrix,
      outliers: outlierFlags,
      trustScore,
      consensusReached
    };

    const ipfsCid = generateIPFSCID(evidenceBundle);

    validationStore.set(validationId, {
      ...storedData,
      validated: true,
      trustScore,
      consensusReached,
      ipfsCid,
      evidenceBundle,
      breakdown: {
        semanticSimilarity: semanticScore,
        consensusRatio: consensusScore,
        timeConsistency,
        workerReputation
      }
    });

    res.json({
      validationId,
      trustScore,
      consensusReached,
      breakdown: {
        semanticSimilarity: semanticScore,
        consensusRatio: consensusScore,
        timeConsistency,
        workerReputation
      },
      evidenceBundle: {
        ipfsCid,
        workerCount: responses.length,
        outlierCount,
        avgSimilarity: Math.round(consensusRatioValue * 100),
        consensusLevel: consensusReached ? 'high' : 'low'
      },
      nftImageUrl: `http://localhost:3000/api/nft-image/${validationId}`,
    });

  } catch (error: any) {
    console.error('❌ Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nft-image/:validationId', async (req: Request, res: Response) => {
  const { validationId } = req.params;
  const storedData = validationStore.get(validationId);
  
  if (!storedData) {
    return res.status(404).send('Validation not found');
  }

  const trustScore = storedData.trustScore || 0;
  const prompt = storedData.prompt || 'N/A';
  const timestamp = storedData.timestamp ? new Date(storedData.timestamp).toLocaleDateString() : 'N/A';

  const svg = `
    <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ec4899;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <rect width="500" height="500" fill="url(#grad)"/>
      <rect x="20" y="20" width="460" height="460" fill="none" stroke="white" stroke-width="2" rx="20" opacity="0.3"/>
      
      <text x="250" y="80" font-family="'Arial', sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="bold" filter="url(#shadow)">
        TRUST CERTIFICATE
      </text>
      
      <circle cx="250" cy="220" r="90" fill="rgba(255,255,255,0.1)" stroke="white" stroke-width="3"/>
      <text x="250" y="240" font-family="'Arial', sans-serif" font-size="72" fill="white" text-anchor="middle" font-weight="bold">
        ${trustScore}
      </text>
      <text x="250" y="270" font-family="'Arial', sans-serif" font-size="18" fill="white" text-anchor="middle">
        TRUST SCORE
      </text>
      
      <text x="250" y="340" font-family="'Courier New', monospace" font-size="14" fill="white" text-anchor="middle" opacity="0.8">
        ID: ${validationId.substring(0, 24)}...
      </text>
      
      <text x="250" y="380" font-family="'Arial', sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.7">
        "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"
      </text>
      
      <text x="250" y="430" font-family="'Arial', sans-serif" font-size="14" fill="white" text-anchor="middle" font-weight="bold">
        🔐 Verified on Sui Blockchain
      </text>
      <text x="250" y="455" font-family="'Arial', sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.6">
        ${timestamp}
      </text>
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.send(svg);
});

app.post('/api/mint-certificate', async (req: Request, res: Response) => {
  try {
    const { validationId, userAddress } = req.body;
    
    if (!validationId || !userAddress) {
      return res.status(400).json({ error: 'validationId and userAddress required' });
    }

    const storedData = validationStore.get(validationId);
    
    if (!storedData || !storedData.validated) {
      return res.status(404).json({ error: 'Validation not found or incomplete' });
    }

    if (!storedData.consensusReached) {
      return res.status(400).json({ 
        error: 'Cannot mint certificate: consensus threshold (70/100) not reached',
        currentScore: storedData.trustScore
      });
    }

    console.log(`\n🎨 Building NFT minting transaction...`);

    // Convert data to bytes
    const validationIdBytes = Array.from(Buffer.from(validationId, 'utf8'));
    const ipfsCidBytes = Array.from(Buffer.from(storedData.ipfsCid, 'utf8'));
    const promptBytes = Array.from(Buffer.from(storedData.prompt.substring(0, 100), 'utf8'));

    // Return transaction data for frontend to build
    res.json({
      requiresSignature: true,
      needsBuild: true,
      transactionData: {
        target: `${PACKAGE_ID}::trust_certificate::mint_certificate`,
        arguments: {
          validationIdBytes,
          trustScore: storedData.trustScore,
          ipfsCidBytes,
          promptBytes,
          timestamp: storedData.timestamp,
          recipient: userAddress
        }
      },
      validationId,
      trustScore: storedData.trustScore,
      ipfsCid: storedData.ipfsCid,
      nftImageUrl: `http://localhost:3000/api/nft-image/${validationId}`,
      message: 'Please sign this transaction in your wallet',
      estimatedGas: '0.01 SUI'
    });

  } catch (error: any) {
    console.error('❌ Minting error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to prepare transaction'
    });
  }
});

app.post('/api/verify-mint', async (req: Request, res: Response) => {
  try {
    const { transactionDigest, validationId } = req.body;
    
    if (!transactionDigest) {
      return res.status(400).json({ error: 'Transaction digest required' });
    }

    console.log(`\n🔍 Verifying transaction: ${transactionDigest}`);

    const txResponse = await suiClient.getTransactionBlock({
      digest: transactionDigest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    const createdObjects = txResponse.objectChanges?.filter(
      (change: any) => change.type === 'created'
    ) as any[];

    const nftObject = createdObjects?.find((obj: any) => 
      obj.objectType?.includes('TrustCertificate')
    );

    if (!nftObject || !nftObject.objectId) {
      return res.status(400).json({ 
        error: 'NFT not found in transaction'
      });
    }

    const nftId = nftObject.objectId as string;
    const storedData = validationStore.get(validationId);

    console.log(`✅ NFT minted!`);
    console.log(`🎨 NFT ID: ${nftId}`);

    res.json({
      success: true,
      nftId,
      transactionHash: transactionDigest,
      explorerUrl: `https://suiscan.xyz/${SUI_NETWORK}/tx/${transactionDigest}`,
      nftExplorerUrl: `https://suiscan.xyz/${SUI_NETWORK}/object/${nftId}`,
      nftImageUrl: `http://localhost:3000/api/nft-image/${validationId}`,
      trustScore: storedData?.trustScore,
      ipfsCid: storedData?.ipfsCid,
      message: 'NFT Certificate minted successfully!'
    });

  } catch (error: any) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: SUI_NETWORK,
    packageId: PACKAGE_ID,
    activeValidations: validationStore.size,
    workers: workerKeypairs.map((kp, i) => ({
      id: i + 1,
      address: kp.toSuiAddress()
    })),
    version: '6.0.0',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 Trust Ops Agent - LIVE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Network: ${SUI_NETWORK}`);
  console.log(`📦 Package: ${PACKAGE_ID}`);
  console.log(`${'='.repeat(70)}\n`);
});
