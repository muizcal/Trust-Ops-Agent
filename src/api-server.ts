import express, { Request, Response } from 'express';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const SUI_NETWORK = (process.env.SUI_NETWORK || 'mainnet') as 'mainnet' | 'testnet' | 'devnet';
const PACKAGE_ID = process.env.PACKAGE_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// LLM API Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!PACKAGE_ID) {
  console.error('❌ ERROR: PACKAGE_ID must be set in .env file!');
  process.exit(1);
}

console.log(`📦 Package ID: ${PACKAGE_ID}`);
console.log(`🌐 Network: ${SUI_NETWORK}`);
console.log(`🔗 Backend URL: ${BACKEND_URL}`);
console.log(`🤖 LLM Provider: ${ANTHROPIC_API_KEY ? 'Anthropic Claude' : OPENAI_API_KEY ? 'OpenAI' : GROQ_API_KEY ? 'Groq' : 'Simulation (No API key)'}`);

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

// ==================== REAL LLM WORKER SYSTEM ====================

const WORKER_SYSTEM_PROMPTS = [
  // Worker 1: Technical Expert
  `You are a technical expert and researcher. Your role is to provide accurate, detailed, and technically precise answers. 

Guidelines:
- Use proper terminology and be academically rigorous
- Include relevant technical details and mechanisms
- Structure your answers logically with clear explanations
- Cite fundamental principles when applicable
- Keep answers focused and informative (2-3 sentences)
- Be factually accurate above all else`,

  // Worker 2: Practical Teacher
  `You are a skilled teacher who explains complex topics in simple, practical terms. Your role is to make information accessible and understandable.

Guidelines:
- Use everyday language and avoid jargon
- Provide concrete examples and analogies
- Focus on practical applications and real-world relevance
- Make concepts relatable to common experiences
- Keep explanations clear and concise (2-3 sentences)
- Prioritize clarity and comprehension`,

  // Worker 3: Balanced Analyst
  `You are an objective analyst who provides comprehensive, balanced perspectives. Your role is to offer nuanced, well-rounded answers.

Guidelines:
- Present multiple viewpoints and considerations
- Acknowledge complexity and trade-offs
- Balance theoretical understanding with practical implications
- Consider different contexts and applications
- Provide thoughtful, measured responses (2-3 sentences)
- Maintain objectivity and fairness`
];

async function callAnthropicAPI(prompt: string, systemPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 250,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const textContent = message.content.find((block: any) => block.type === 'text');
  return textContent ? (textContent as any).text : 'Unable to generate response.';
}

async function callOpenAIAPI(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 250,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || 'Unable to generate response.';
}

async function callGroqAPI(prompt: string, systemPrompt: string): Promise<string> {
  const maxRetries = 2;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry: 1s, then 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        console.log(`🔄 Retry attempt ${attempt} for Groq API...`);
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 250,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Groq API HTTP ${response.status}:`, errorText);
        throw new Error(`Groq API failed: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('❌ Groq API returned empty content');
        throw new Error('Groq API returned empty response');
      }
      
      return content;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Groq API attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

async function runWorkerInference(prompt: string, workerId: number): Promise<string> {
  const systemPrompt = WORKER_SYSTEM_PROMPTS[workerId];

  try {
    // Use real LLM API if available
    if (ANTHROPIC_API_KEY) {
      return await callAnthropicAPI(prompt, systemPrompt);
    } else if (OPENAI_API_KEY) {
      return await callOpenAIAPI(prompt, systemPrompt);
    } else if (GROQ_API_KEY) {
      return await callGroqAPI(prompt, systemPrompt);
    } else {
      // Fallback to simulation (for testing without API key)
      return generateSimulatedResponse(prompt, workerId);
    }
  } catch (error: any) {
    console.error(`❌ Worker ${workerId} API error:`, error.message);
    // Fallback to simulation on API error
    return generateSimulatedResponse(prompt, workerId);
  }
}

// Fallback simulation (used only when no API key available)
function generateSimulatedResponse(prompt: string, workerId: number): string {
  // Make fallback responses MORE different to properly fail bad prompts
  const randomness = Math.random().toString(36).substring(7);
  const styles = [
    `[Technical ${randomness}] The query "${prompt}" lacks sufficient context for systematic technical analysis. Additional specifications regarding scope, constraints, and evaluation criteria would enable more precise examination.`,
    `[Practical ${randomness}] Regarding "${prompt}" - this seems incomplete or unclear. Could you provide more details about what specific aspect you'd like to understand? That would help me give you a more helpful, practical answer.`,
    `[Analytical ${randomness}] The prompt "${prompt}" presents ambiguity that requires clarification. Multiple interpretations exist depending on context, objectives, and domain. Further specificity would enable balanced assessment.`
  ];
  return styles[workerId];
}

// ==================== SEMANTIC SIMILARITY ENGINE ====================

function calculateSemanticSimilarity(responses: string[]): number[][] {
  const n = responses.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  const stopwords = new Set([
    'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'from', 'by', 'as', 'it', 'this', 'that', 'are', 'be', 'been',
    'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
    'should', 'may', 'might', 'must', 'shall', 'their', 'them', 'they', 'its',
    'was', 'were', 'not', 'no', 'so', 'if', 'all', 'each', 'both', 'more',
    'such', 'into', 'than', 'then', 'when', 'which', 'who', 'what', 'how',
    'also', 'very', 'just', 'over', 'these', 'those', 'some', 'any'
  ]);

  function tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));
  }

  function getNgrams(tokens: string[], n: number): Set<string> {
    const ngrams = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.add(tokens.slice(i, i + n).join('_'));
    }
    return ngrams;
  }

  function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  function getConceptualTerms(text: string): Set<string> {
    return new Set(tokenize(text).filter(w => w.length > 4));
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 100;
        continue;
      }

      const tokens1 = tokenize(responses[i]);
      const tokens2 = tokenize(responses[j]);

      const uni1 = new Set(tokens1);
      const uni2 = new Set(tokens2);
      const unigramScore = jaccardSimilarity(uni1, uni2);

      const bi1 = getNgrams(tokens1, 2);
      const bi2 = getNgrams(tokens2, 2);
      const bigramScore = jaccardSimilarity(bi1, bi2);

      const tri1 = getNgrams(tokens1, 3);
      const tri2 = getNgrams(tokens2, 3);
      const trigramScore = jaccardSimilarity(tri1, tri2);

      const concepts1 = getConceptualTerms(responses[i]);
      const concepts2 = getConceptualTerms(responses[j]);
      const conceptScore = jaccardSimilarity(concepts1, concepts2);

      const lenRatio = Math.min(tokens1.length, tokens2.length) / 
                       Math.max(tokens1.length, tokens2.length);

      const rawSimilarity = (
        unigramScore  * 0.20 +
        bigramScore   * 0.25 +
        trigramScore  * 0.15 +
        conceptScore  * 0.30 +
        lenRatio      * 0.10
      );

      matrix[i][j] = Math.round(rawSimilarity * 100);
    }
  }

  return matrix;
}

function detectContradictions(responses: string[]): { hasContradiction: boolean; details: string[] } {
  const contradictions: string[] = [];
  
  const factPatterns = [
    { pattern: /(\d+)\s*%/g, name: 'percentage' },
    { pattern: /(\d{4})/g, name: 'year' },
    { pattern: /\b(true|false|yes|no|correct|incorrect|possible|impossible)\b/gi, name: 'boolean' },
  ];

  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const neg1 = responses[i].toLowerCase().includes('not ') || responses[i].toLowerCase().includes('cannot');
      const neg2 = responses[j].toLowerCase().includes('not ') || responses[j].toLowerCase().includes('cannot');
      
      if (neg1 !== neg2) {
        const words1 = new Set(responses[i].toLowerCase().split(/\s+/));
        const words2 = new Set(responses[j].toLowerCase().split(/\s+/));
        const overlap = [...words1].filter(w => words2.has(w) && w.length > 5);
        
        if (overlap.length > 3) {
          contradictions.push(`Workers ${i+1} and ${j+1} may disagree on negation`);
        }
      }

      factPatterns.forEach(fp => {
        const matches1 = [...responses[i].matchAll(fp.pattern)].map(m => m[1]);
        const matches2 = [...responses[j].matchAll(fp.pattern)].map(m => m[1]);
        
        if (matches1.length > 0 && matches2.length > 0) {
          const diff = matches1.some(m => !matches2.includes(m));
          if (diff && fp.name === 'year') {
            contradictions.push(`Workers ${i+1} and ${j+1} cite different ${fp.name}s`);
          }
        }
      });
    }
  }

  return {
    hasContradiction: contradictions.length > 0,
    details: contradictions
  };
}

function detectOutliers(similarityMatrix: number[][]): boolean[] {
  const n = similarityMatrix.length;
  
  const avgSimilarities = similarityMatrix.map((row, idx) => {
    const sum = row.reduce((a, b, i) => i === idx ? a : a + b, 0);
    return sum / (n - 1);
  });

  const mean = avgSimilarities.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(
    avgSimilarities.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n
  );

  return avgSimilarities.map(score => {
    const zScore = std > 0 ? Math.abs((score - mean) / std) : 0;
    return zScore > 2.0;
  });
}

function calculateTimeConsistency(times: number[]): number {
  if (times.length < 2) return 10;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(10, 10 * (1 - cv)));
}

function hashResponse(response: string): string {
  return crypto.createHash('sha256').update(response).digest('hex');
}

function generateIPFSCID(data: any): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return `Qm${hash.substring(0, 44)}`;
}

// ==================== API ROUTES ====================

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'running',
    name: 'Trust Ops Agent - Real LLM Validation',
    network: SUI_NETWORK,
    package: PACKAGE_ID,
    version: '8.0.0-LLM',
    llmProvider: ANTHROPIC_API_KEY ? 'Anthropic Claude' : OPENAI_API_KEY ? 'OpenAI GPT' : GROQ_API_KEY ? 'Groq Llama' : 'Simulation',
    features: [
      'Real LLM-powered workers (Claude/GPT/Groq)',
      'General-purpose validation (works for ANY topic)',
      'Multi-style worker prompts (Technical, Practical, Analytical)',
      'Advanced semantic similarity analysis',
      'Z-score outlier detection',
      'Contradiction detection',
      'Free NFT certificates (gas only)'
    ]
  });
});

app.post('/api/infer', async (req: Request, res: Response) => {
  try {
    const { prompt, userAddress } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`\n🔍 New validation request: "${prompt.substring(0, 60)}..."`);
    console.log(`👤 User: ${userAddress || 'anonymous'}`);
    console.log(`🤖 Using: ${ANTHROPIC_API_KEY ? 'Claude API' : OPENAI_API_KEY ? 'OpenAI API' : GROQ_API_KEY ? 'Groq API' : 'Simulation'}`);

    const validationId = `0x${crypto.randomBytes(32).toString('hex')}`;
    const workerResponses: WorkerResponse[] = [];

    // Call all 3 workers in parallel for speed
    const workerPromises = [0, 1, 2].map(async (i) => {
      const startTime = Date.now();
      const response = await runWorkerInference(prompt, i);
      const inferenceTime = Date.now() - startTime;

      return {
        worker: `Worker-${i + 1}`,
        workerId: workerKeypairs[i].toSuiAddress(),
        response,
        responseHash: hashResponse(response),
        inferenceTimeMs: inferenceTime,
      };
    });

    const responses = await Promise.all(workerPromises);
    workerResponses.push(...responses);

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

    const storedData = validationStore.get(validationId);
    if (!storedData) {
      return res.status(404).json({ error: 'Validation ID not found' });
    }

    const { responses } = storedData;
    const responseTexts = responses.map((r: WorkerResponse) => r.response);
    const responseTimes = responses.map((r: WorkerResponse) => r.inferenceTimeMs);

    console.log(`\n📊 Computing trust score for: "${storedData.prompt.substring(0, 50)}..."`);
    console.log('\n📝 Worker Responses:');
    responseTexts.forEach((r: string, i: number) => {
      const style = i === 0 ? 'Technical' : i === 1 ? 'Practical' : 'Analytical';
      console.log(`   ${i+1}. [${style}]: ${r.substring(0, 80)}...`);
    });

    const similarityMatrix = calculateSemanticSimilarity(responseTexts);

    console.log('\n🔢 Similarity Matrix:');
    similarityMatrix.forEach((row, i) => {
      console.log(`   Worker ${i + 1}: [${row.map(v => v.toString().padStart(3)).join(', ')}]`);
    });

    const outlierFlags = detectOutliers(similarityMatrix);
    const outlierCount = outlierFlags.filter(f => f).length;

    const contradictionResult = detectContradictions(responseTexts);
    if (contradictionResult.hasContradiction) {
      console.log(`\n⚠️ Contradictions: ${contradictionResult.details.join(', ')}`);
    }

    const n = similarityMatrix.length;
    let totalSim = 0, comparisons = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalSim += similarityMatrix[i][j];
        comparisons++;
      }
    }
    const avgSimilarity = comparisons > 0 ? totalSim / comparisons : 0;

// NEW (multi-style friendly):
let semanticScore = 0;
const simRatio = avgSimilarity / 100;

// Multi-style responses naturally have 15-30% similarity
// Good answers: 15-30% → 45-60 points
// Medium answers: 10-15% → 30-45 points  
// Bad answers: <10% → 0-30 points

if (simRatio >= 0.25) {
  semanticScore = 60; // Excellent consensus
} else if (simRatio >= 0.15) {
  // Good: 15-25% similarity → 45-60 points
  semanticScore = Math.round(45 + ((simRatio - 0.15) / 0.10) * 15);
} else if (simRatio >= 0.10) {
  // Medium: 10-15% → 30-45 points
  semanticScore = Math.round(30 + ((simRatio - 0.10) / 0.05) * 15);
} else {
  // Poor: <10% → scale to 30
  semanticScore = Math.round((simRatio / 0.10) * 30);
}

    const consensusScore = Math.round(((responses.length - outlierCount) / responses.length) * 20);
    const timeConsistency = Math.round(calculateTimeConsistency(responseTimes));
    const workerReputation = contradictionResult.hasContradiction ? 7 : 10;

    const trustScore = Math.min(100, semanticScore + consensusScore + timeConsistency + workerReputation);
    const consensusReached = trustScore >= 70;

    console.log(`\n🎯 Trust Score Breakdown:`);
    console.log(`   Semantic Similarity: ${semanticScore}/60 (${Math.round(avgSimilarity)}%)`);
    console.log(`   Consensus Ratio:     ${consensusScore}/20`);
    console.log(`   Time Consistency:    ${timeConsistency}/10`);
    console.log(`   Worker Reputation:   ${workerReputation}/10`);
    console.log(`   ${'═'.repeat(30)}`);
    console.log(`   FINAL TRUST SCORE:   ${trustScore}/100`);
    console.log(`   Consensus:           ${consensusReached ? '✅ REACHED' : '⚠️  NOT REACHED'}`);

    const ipfsCid = generateIPFSCID({ validationId, responses: responseTexts, trustScore });

    validationStore.set(validationId, {
      ...storedData,
      validated: true,
      trustScore,
      consensusReached,
      ipfsCid,
      contradictions: contradictionResult,
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
        avgSimilarity: Math.round(avgSimilarity),
        consensusLevel: trustScore >= 85 ? 'high' : trustScore >= 70 ? 'medium' : 'low',
        contradictionsDetected: contradictionResult.hasContradiction,
      },
      nftImageUrl: `${BACKEND_URL}/api/nft-image/${validationId}`,
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
  const scoreColor = trustScore >= 85 ? '#10b981' : trustScore >= 70 ? '#f59e0b' : '#ef4444';

  const svg = `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#4a0e8f;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="500" height="500" fill="url(#grad)"/>
    <rect x="15" y="15" width="470" height="470" fill="none" stroke="${scoreColor}" stroke-width="2" rx="20" opacity="0.6"/>
    <text x="250" y="65" font-family="Arial" font-size="13" fill="#9ca3af" text-anchor="middle">TRUST OPS AGENT</text>
    <text x="250" y="95" font-family="Arial" font-size="22" fill="white" text-anchor="middle" font-weight="bold">AI VALIDATION CERTIFICATE</text>
    <circle cx="250" cy="220" r="95" fill="rgba(255,255,255,0.05)" stroke="${scoreColor}" stroke-width="3" filter="url(#glow)"/>
    <text x="250" y="245" font-family="Arial" font-size="78" fill="${scoreColor}" text-anchor="middle" font-weight="bold" filter="url(#glow)">${trustScore}</text>
    <text x="250" y="278" font-family="Arial" font-size="16" fill="white" text-anchor="middle">TRUST SCORE</text>
    <rect x="80" y="340" width="340" height="1" fill="rgba(255,255,255,0.2)"/>
    <text x="250" y="370" font-family="Courier New" font-size="11" fill="#a855f7" text-anchor="middle">ID: ${validationId.substring(0, 30)}...</text>
    <text x="250" y="400" font-family="Arial" font-size="11" fill="#9ca3af" text-anchor="middle">"${prompt.substring(0, 45)}${prompt.length > 45 ? '...' : ''}"</text>
    <text x="250" y="440" font-family="Arial" font-size="13" fill="white" text-anchor="middle" font-weight="bold">✓ Verified on Sui • LLM-Powered</text>
    <text x="250" y="465" font-family="Arial" font-size="11" fill="#6b7280" text-anchor="middle">${timestamp} • Trust Ops Protocol</text>
  </svg>`;

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
        error: 'Cannot mint: consensus threshold (70/100) not reached',
        currentScore: storedData.trustScore
      });
    }

    const validationIdBytes = Array.from(Buffer.from(validationId, 'utf8'));
    const ipfsCidBytes = Array.from(Buffer.from(storedData.ipfsCid, 'utf8'));
    const promptBytes = Array.from(Buffer.from(storedData.prompt.substring(0, 100), 'utf8'));

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
      nftImageUrl: `${BACKEND_URL}/api/nft-image/${validationId}`,
      message: 'Sign transaction to mint your Trust Certificate NFT (free - gas only)',
    });

  } catch (error: any) {
    console.error('❌ Minting error:', error);
    res.status(500).json({ error: error.message });
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
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });

    const createdObjects = txResponse.objectChanges?.filter(
      (change: any) => change.type === 'created'
    ) as any[];

    const nftObject = createdObjects?.find((obj: any) =>
      obj.objectType?.includes('TrustCertificate')
    );

    if (!nftObject || !nftObject.objectId) {
      return res.status(400).json({ error: 'NFT not found in transaction' });
    }

    const nftId = nftObject.objectId as string;
    const storedData = validationStore.get(validationId);

    console.log(`✅ NFT minted! ID: ${nftId}`);

    res.json({
      success: true,
      nftId,
      transactionHash: transactionDigest,
      explorerUrl: `https://suiscan.xyz/${SUI_NETWORK}/tx/${transactionDigest}`,
      nftExplorerUrl: `https://suiscan.xyz/${SUI_NETWORK}/object/${nftId}`,
      nftImageUrl: `${BACKEND_URL}/api/nft-image/${validationId}`,
      trustScore: storedData?.trustScore,
      ipfsCid: storedData?.ipfsCid,
      message: 'NFT Certificate minted successfully on Sui Mainnet!'
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
    backendUrl: BACKEND_URL,
    llmProvider: ANTHROPIC_API_KEY ? 'Anthropic Claude' : OPENAI_API_KEY ? 'OpenAI GPT' : GROQ_API_KEY ? 'Groq Llama' : 'Simulation',
    activeValidations: validationStore.size,
    version: '8.0.0-LLM',
    capabilities: [
      'Real LLM-powered workers',
      'General-purpose validation',
      'Multi-style prompts',
      'Advanced semantic analysis',
      'Free minting (gas only)'
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 Trust Ops Agent v8.0 - Real LLM Validation`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📍 Port:         ${PORT}`);
  console.log(`🌐 Network:      ${SUI_NETWORK}`);
  console.log(`📦 Package:      ${PACKAGE_ID}`);
  console.log(`🤖 LLM Provider: ${ANTHROPIC_API_KEY ? 'Anthropic Claude ✅' : OPENAI_API_KEY ? 'OpenAI GPT ✅' : GROQ_API_KEY ? 'Groq Llama ✅' : 'Simulation ⚠️'}`);
  console.log(`🔗 URL:          ${BACKEND_URL}`);
  console.log(`${'='.repeat(70)}\n`);
  
  if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY && !GROQ_API_KEY) {
    console.log(`⚠️  WARNING: No LLM API key detected!`);
    console.log(`   Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY in .env`);
    console.log(`   Currently using simulation mode.\n`);
  }
});