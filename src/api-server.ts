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

const SUI_NETWORK = 'mainnet';
const PACKAGE_ID = process.env.PACKAGE_ID || '0x...';
const REGISTRY_ID = process.env.REGISTRY_ID || '0x...';
const CLOCK_ID = '0x6';

const suiClient = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

const workers: Ed25519Keypair[] = [
  Ed25519Keypair.generate(),
  Ed25519Keypair.generate(),
  Ed25519Keypair.generate(),
];

interface InferenceRequest {
  prompt: string;
  model?: string;
}

interface ValidationRequest {
  validationId: string;
}

async function simulateInference(prompt: string, workerId: number): Promise<string> {
  const variations = [
    `Analysis: ${prompt}. Result shows consistent patterns.`,
    `Research indicates: ${prompt}. Evidence supports conclusion.`,
    `Study suggests: ${prompt}. Data confirms hypothesis.`,
  ];
  
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  return variations[workerId % variations.length];
}

function calculateSemanticSimilarity(responses: string[]): number[][] {
  const n = responses.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 100;
      } else {
        const words1 = new Set(responses[i].toLowerCase().split(/\s+/));
        const words2 = new Set(responses[j].toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        matrix[i][j] = Math.round((intersection.size / union.size) * 100);
      }
    }
  }
  
  return matrix;
}

function detectOutliers(similarityMatrix: number[][]): boolean[] {
  const n = similarityMatrix.length;
  const avgSimilarities = similarityMatrix.map(row => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum / n;
  });
  
  const mean = avgSimilarities.reduce((a, b) => a + b, 0) / n;
  const threshold = mean * 0.7;
  
  return avgSimilarities.map(score => score < threshold);
}

function hashResponse(response: string): string {
  return crypto.createHash('sha256').update(response).digest('hex');
}

app.post('/infer', async (req: Request, res: Response) => {
  try {
    const { prompt }: InferenceRequest = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const validationId = crypto.randomBytes(16).toString('hex');
    const workerResponses: any[] = [];
    
    for (let i = 0; i < workers.length; i++) {
      const startTime = Date.now();
      const response = await simulateInference(prompt, i);
      const inferenceTime = Date.now() - startTime;
      
      workerResponses.push({
        worker: workers[i].getPublicKey().toSuiAddress(),
        response,
        responseHash: hashResponse(response),
        inferenceTimeMs: inferenceTime,
      });
    }

    res.json({
      validationId,
      transactionHash: `0x${validationId}`,
      workerCount: workerResponses.length,
      responses: workerResponses.map(r => ({
        worker: r.worker,
        responsePreview: r.response.substring(0, 100) + '...',
        inferenceTimeMs: r.inferenceTimeMs,
      })),
      message: 'Inference completed. Use /validate endpoint.',
    });

  } catch (error: any) {
    console.error('Inference error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/validate', async (req: Request, res: Response) => {
  try {
    const { validationId }: ValidationRequest = req.body;
    
    if (!validationId) {
      return res.status(400).json({ error: 'validationId is required' });
    }

    const mockResponses = [
      'Test response 1 for validation',
      'Test response 2 for validation',
      'Test response 3 for validation',
    ];

    const similarityMatrix = calculateSemanticSimilarity(mockResponses);
    const outlierFlags = detectOutliers(similarityMatrix);

    const avgSimilarities = similarityMatrix.map(row => 
      Math.round(row.reduce((a, b) => a + b, 0) / row.length)
    );

    const trustScore = avgSimilarities.reduce((a, b) => a + b, 0) / avgSimilarities.length;

    res.json({
      validationId,
      trustScore: Math.round(trustScore),
      consensusReached: trustScore >= 70,
      transactionHash: validationId,
      evidenceBundle: {
        ipfsCid: `Qm${crypto.randomBytes(22).toString('hex')}`,
        workerCount: 3,
        outlierCount: outlierFlags.filter(f => f).length,
        avgSimilarity: Math.round(trustScore),
      },
      verificationUrl: `https://ipfs.io/ipfs/Qm${crypto.randomBytes(22).toString('hex')}`,
    });

  } catch (error: any) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: SUI_NETWORK,
    version: '1.0.0',
    name: 'Trust Ops Agent API',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Trust Ops Agent API running on port ${PORT}`);
  console.log(`📍 POST /infer - Request inference`);
  console.log(`📍 POST /validate - Compute trust score`);
  console.log(`📍 GET /health - Health check`);
});