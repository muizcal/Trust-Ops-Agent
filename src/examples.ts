// examples.ts - Usage Examples for Cortensor Validation API

import axios from 'axios';

const API_URL = 'http://localhost:3000';

// ==================== Example 1: Simple Validation ====================
async function example1_simpleValidation() {
  console.log('\n=== Example 1: Simple Validation ===\n');

  // Step 1: Request inference
  const inferResponse = await axios.post(`${API_URL}/infer`, {
    prompt: 'What is the capital of France?',
  });

  console.log('✅ Inference requested');
  console.log(`Validation ID: ${inferResponse.data.validationId}`);
  console.log(`Worker Count: ${inferResponse.data.workerCount}`);

  // Step 2: Wait for workers to respond
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Compute trust score
  const validateResponse = await axios.post(`${API_URL}/validate`, {
    validationId: inferResponse.data.validationId,
  });

  console.log('\n✅ Validation complete');
  console.log(`Trust Score: ${validateResponse.data.trustScore}/100`);
  console.log(`Consensus: ${validateResponse.data.consensusReached ? 'YES' : 'NO'}`);
  console.log(`IPFS CID: ${validateResponse.data.evidenceBundle.ipfsCid}`);
  console.log(`Verification URL: ${validateResponse.data.verificationUrl}`);
}

// ==================== Example 2: Research Validation ====================
async function example2_researchValidation() {
  console.log('\n=== Example 2: Research Paper Validation ===\n');

  const prompt = `
    Summarize the key findings from this research paper abstract:
    "We propose a novel transformer architecture that achieves 
    state-of-the-art results on machine translation tasks..."
  `;

  const inferResponse = await axios.post(`${API_URL}/infer`, { prompt });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const validateResponse = await axios.post(`${API_URL}/validate`, {
    validationId: inferResponse.data.validationId,
  });

  if (validateResponse.data.trustScore >= 70) {
    console.log('✅ High confidence research summary - can be used');
  } else {
    console.log('⚠️  Low confidence - requires manual review');
  }

  console.log(`Trust Score: ${validateResponse.data.trustScore}`);
  console.log(`Outliers: ${validateResponse.data.evidenceBundle.outlierCount}`);
}

// ==================== Example 3: Policy Test ====================
async function example3_deterministicPolicy() {
  console.log('\n=== Example 3: Deterministic Policy Test ===\n');

  // Test with deterministic question (should reach consensus)
  const prompts = [
    'What is 2 + 2?',
    'Is water H2O?',
    'What year comes after 2023?',
  ];

  for (const prompt of prompts) {
    const inferResponse = await axios.post(`${API_URL}/infer`, { prompt });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const validateResponse = await axios.post(`${API_URL}/validate`, {
      validationId: inferResponse.data.validationId,
    });

    console.log(`\nPrompt: ${prompt}`);
    console.log(`Trust Score: ${validateResponse.data.trustScore}`);
    console.log(`Expected: >90 (deterministic answer)`);
    
    if (validateResponse.data.trustScore < 90) {
      console.log('⚠️  WARNING: Low trust score for deterministic query!');
    }
  }
}

// ==================== Example 4: Batch Validation ====================
async function example4_batchValidation() {
  console.log('\n=== Example 4: Batch Validation ===\n');

  const prompts = [
    'Explain quantum entanglement',
    'What are the benefits of renewable energy?',
    'Describe the water cycle',
    'How does blockchain consensus work?',
    'What is machine learning?',
  ];

  console.log(`Validating ${prompts.length} prompts...`);

  // Request all inferences
  const validationIds = await Promise.all(
    prompts.map(async (prompt) => {
      const response = await axios.post(`${API_URL}/infer`, { prompt });
      return {
        id: response.data.validationId,
        prompt,
      };
    })
  );

  // Wait for all workers
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Validate all
  const results = await Promise.all(
    validationIds.map(async ({ id, prompt }) => {
      const response = await axios.post(`${API_URL}/validate`, {
        validationId: id,
      });
      return {
        prompt,
        trustScore: response.data.trustScore,
        consensus: response.data.consensusReached,
      };
    })
  );

  // Summary
  console.log('\n📊 Batch Validation Results:');
  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.prompt.substring(0, 40)}...`);
    console.log(`   Trust: ${result.trustScore}/100 | Consensus: ${result.consensus ? '✓' : '✗'}`);
  });

  const avgTrust = results.reduce((sum, r) => sum + r.trustScore, 0) / results.length;
  console.log(`\n📈 Average Trust Score: ${avgTrust.toFixed(2)}/100`);
}

// ==================== Example 5: Worker Reputation Tracking ====================
async function example5_workerReputation() {
  console.log('\n=== Example 5: Worker Reputation Tracking ===\n');

  // Get worker addresses (in production, fetch from blockchain)
  const workerAddresses = [
    '0x1234...', 
    '0x5678...',
    '0x9abc...',
  ];

  console.log('Worker Reputation Report:');
  for (const address of workerAddresses) {
    try {
      const response = await axios.get(`${API_URL}/worker/${address}`);
      console.log(`\nWorker: ${address}`);
      console.log(`Reputation: ${response.data.reputation}/100`);
    } catch (error) {
      console.log(`Worker ${address}: Not found`);
    }
  }
}

// ==================== Example 6: Evidence Bundle Verification ====================
async function example6_evidenceBundleVerification() {
  console.log('\n=== Example 6: Evidence Bundle Verification ===\n');

  // Create validation
  const inferResponse = await axios.post(`${API_URL}/infer`, {
    prompt: 'Explain the theory of relativity',
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  const validateResponse = await axios.post(`${API_URL}/validate`, {
    validationId: inferResponse.data.validationId,
  });

  const bundle = validateResponse.data.evidenceBundle;

  console.log('📦 Evidence Bundle Analysis:');
  console.log(`├─ Workers: ${bundle.workerCount}`);
  console.log(`├─ Outliers: ${bundle.outlierCount}`);
  console.log(`├─ Avg Similarity: ${bundle.avgSimilarity}%`);
  console.log(`├─ IPFS CID: ${bundle.ipfsCid}`);
  console.log(`└─ Verification: ${validateResponse.data.verificationUrl}`);

  // Verify bundle on IPFS
  try {
    const ipfsResponse = await axios.get(validateResponse.data.verificationUrl);
    console.log('\n✅ Evidence bundle verified on IPFS');
    console.log('Bundle contains:');
    console.log(`- Version: ${ipfsResponse.data.version}`);
    console.log(`- Timestamp: ${ipfsResponse.data.timestamp}`);
    console.log(`- Trust Score: ${ipfsResponse.data.trustScore}`);
  } catch (error) {
    console.log('⚠️  IPFS verification pending');
  }
}

// ==================== Example 7: Continuous Monitoring ====================
async function example7_continuousMonitoring() {
  console.log('\n=== Example 7: Continuous Monitoring ===\n');

  console.log('Starting continuous monitoring (press Ctrl+C to stop)...\n');

  let iteration = 0;
  const interval = setInterval(async () => {
    iteration++;
    console.log(`\n[${new Date().toISOString()}] Iteration ${iteration}`);

    try {
      const inferResponse = await axios.post(`${API_URL}/infer`, {
        prompt: `Monitor system status - iteration ${iteration}`,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const validateResponse = await axios.post(`${API_URL}/validate`, {
        validationId: inferResponse.data.validationId,
      });

      if (validateResponse.data.trustScore < 70) {
        console.log('🚨 ALERT: Low trust score detected!');
        console.log(`Trust: ${validateResponse.data.trustScore}/100`);
        // Send alert to monitoring system
      } else {
        console.log(`✅ System healthy - Trust: ${validateResponse.data.trustScore}/100`);
      }
    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
    }
  }, 10000); // Every 10 seconds

  // Run for 1 minute then stop
  setTimeout(() => {
    clearInterval(interval);
    console.log('\nMonitoring stopped');
  }, 60000);
}

// ==================== Run All Examples ====================
async function runAllExamples() {
  try {
    await example1_simpleValidation();
    await example2_researchValidation();
    await example3_deterministicPolicy();
    await example4_batchValidation();
    await example5_workerReputation();
    await example6_evidenceBundleVerification();
    // await example7_continuousMonitoring(); // Uncomment for continuous mode

    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('❌ Error running examples:', error.message);
  }
}

// Execute
if (require.main === module) {
  runAllExamples();
}

export {
  example1_simpleValidation,
  example2_researchValidation,
  example3_deterministicPolicy,
  example4_batchValidation,
  example5_workerReputation,
  example6_evidenceBundleVerification,
  example7_continuousMonitoring,
};