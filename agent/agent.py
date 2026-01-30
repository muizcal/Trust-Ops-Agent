#!/usr/bin/env python3
"""
Cortensor Validation Ops Agent
Autonomous agent for monitoring and validating AI outputs
"""

import asyncio
import aiohttp
import json
import hashlib
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

# ==================== Configuration ====================
API_BASE_URL = "http://localhost:3000"
VALIDATION_THRESHOLD = 70  # Minimum trust score
MIN_WORKERS = 3
SIMILARITY_THRESHOLD = 0.75

# ==================== Data Models ====================
@dataclass
class ValidationRequest:
    prompt: str
    model: Optional[str] = "gpt-4"
    min_workers: int = MIN_WORKERS

@dataclass
class WorkerResponse:
    worker: str
    response: str
    response_hash: str
    inference_time_ms: int
    similarity_score: float = 0.0

@dataclass
class TrustScore:
    score: int
    consensus_reached: bool
    outlier_count: int
    avg_similarity: float
    evidence_cid: str

# ==================== Agent Core ====================
class CortensorValidationAgent:
    """Agentic assistant for autonomous validation"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        self.validation_history: List[Dict] = []
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    # ==================== Main Validation Flow ====================
    
    async def validate_output(
        self, 
        prompt: str,
        expected_format: Optional[str] = None
    ) -> TrustScore:
        """
        Main validation pipeline:
        1. Request inference from multiple workers
        2. Analyze semantic similarity
        3. Detect outliers
        4. Compute trust score
        5. Generate evidence bundle
        """
        print(f"\n🔍 Starting validation for: {prompt[:50]}...")
        
        # Step 1: Request inference
        validation_id = await self._request_inference(prompt)
        print(f"✅ Validation ID: {validation_id}")
        
        # Step 2: Wait for workers to respond (in production, use webhooks)
        await asyncio.sleep(2)
        
        # Step 3: Compute trust score
        trust_score = await self._compute_trust_score(validation_id)
        print(f"📊 Trust Score: {trust_score.score}/100")
        print(f"✓ Consensus: {'Yes' if trust_score.consensus_reached else 'No'}")
        print(f"🔗 Evidence: ipfs://{trust_score.evidence_cid}")
        
        # Step 4: Store in history
        self.validation_history.append({
            'timestamp': datetime.now().isoformat(),
            'prompt': prompt,
            'validation_id': validation_id,
            'trust_score': trust_score.score,
            'consensus': trust_score.consensus_reached,
        })
        
        return trust_score
    
    async def _request_inference(self, prompt: str) -> str:
        """Request inference from multiple workers (PoI)"""
        async with self.session.post(
            f"{API_BASE_URL}/infer",
            json={"prompt": prompt}
        ) as resp:
            data = await resp.json()
            return data['validationId']
    
    async def _compute_trust_score(self, validation_id: str) -> TrustScore:
        """Compute trust score using PoUW"""
        async with self.session.post(
            f"{API_BASE_URL}/validate",
            json={"validationId": validation_id}
        ) as resp:
            data = await resp.json()
            return TrustScore(
                score=data['trustScore'],
                consensus_reached=data['consensusReached'],
                outlier_count=data['evidenceBundle']['outlierCount'],
                avg_similarity=data['evidenceBundle']['avgSimilarity'],
                evidence_cid=data['evidenceBundle']['ipfsCid'],
            )
    
    # ==================== Advanced Validation ====================
    
    def calculate_semantic_similarity(
        self, 
        responses: List[str]
    ) -> np.ndarray:
        """
        Calculate semantic similarity using sentence embeddings
        Returns: NxN similarity matrix
        """
        embeddings = self.embedder.encode(responses)
        similarity_matrix = cosine_similarity(embeddings)
        return similarity_matrix
    
    def detect_outliers(
        self, 
        similarity_matrix: np.ndarray,
        threshold: float = SIMILARITY_THRESHOLD
    ) -> List[bool]:
        """
        Detect outlier responses based on similarity
        Returns: Boolean array indicating outliers
        """
        n = len(similarity_matrix)
        avg_similarities = similarity_matrix.mean(axis=1)
        mean_similarity = avg_similarities.mean()
        std_similarity = avg_similarities.std()
        
        # Z-score based outlier detection
        z_scores = np.abs((avg_similarities - mean_similarity) / std_similarity)
        outliers = z_scores > 2.0  # 2 standard deviations
        
        return outliers.tolist()
    
    def calculate_consensus_score(
        self,
        responses: List[WorkerResponse],
        similarity_matrix: np.ndarray,
        outlier_flags: List[bool]
    ) -> int:
        """
        Calculate weighted trust score (0-100)
        Factors:
        - Average semantic similarity
        - Outlier ratio
        - Response time consistency
        - Worker reputation (from blockchain)
        """
        # Filter out outliers
        valid_indices = [i for i, is_outlier in enumerate(outlier_flags) if not is_outlier]
        
        if not valid_indices:
            return 0
        
        # Semantic similarity score (0-60 points)
        valid_similarities = similarity_matrix[np.ix_(valid_indices, valid_indices)]
        avg_similarity = valid_similarities.mean()
        similarity_score = min(60, int(avg_similarity * 60))
        
        # Consensus ratio (0-20 points)
        consensus_ratio = len(valid_indices) / len(responses)
        consensus_score = int(consensus_ratio * 20)
        
        # Response time consistency (0-10 points)
        valid_times = [responses[i].inference_time_ms for i in valid_indices]
        time_std = np.std(valid_times)
        time_mean = np.mean(valid_times)
        time_cv = time_std / time_mean if time_mean > 0 else 1
        time_score = max(0, int(10 * (1 - time_cv)))
        
        # Worker reputation bonus (0-10 points)
        reputation_score = 10  # Simplified, query from blockchain in production
        
        total_score = similarity_score + consensus_score + time_score + reputation_score
        return min(100, total_score)
    
    # ==================== Monitoring & Alerting ====================
    
    async def monitor_repository(
        self, 
        repo_url: str,
        check_interval: int = 300
    ):
        """
        DevOps Agent: Monitor repository for changes and validate
        """
        print(f"👀 Monitoring repository: {repo_url}")
        while True:
            # Fetch latest commit/summary
            summary = await self._fetch_repo_summary(repo_url)
            
            # Validate the summary
            trust_score = await self.validate_output(
                f"Summarize the latest changes in {repo_url}: {summary}"
            )
            
            if trust_score.score < VALIDATION_THRESHOLD:
                await self._send_alert(
                    f"⚠️ Low trust score ({trust_score.score}) for {repo_url}"
                )
            
            await asyncio.sleep(check_interval)
    
    async def validate_research_summary(
        self, 
        document_path: str
    ) -> TrustScore:
        """
        Research Ops Agent: Validate AI-generated research summaries
        """
        print(f"📄 Validating research document: {document_path}")
        
        # Read document
        with open(document_path, 'r') as f:
            content = f.read()
        
        # Generate validation prompt
        prompt = f"Provide a concise summary of this research: {content[:500]}..."
        
        # Validate
        return await self.validate_output(prompt)
    
    async def _fetch_repo_summary(self, repo_url: str) -> str:
        """Fetch repository summary (mock implementation)"""
        return f"Latest commit in {repo_url}: Added new feature X"
    
    async def _send_alert(self, message: str):
        """Send alert to monitoring system"""
        print(f"🚨 ALERT: {message}")
        # Integrate with Slack, PagerDuty, etc.
    
    # ==================== Evidence Bundle ====================
    
    def generate_evidence_bundle(
        self,
        validation_id: str,
        responses: List[WorkerResponse],
        similarity_matrix: np.ndarray,
        outlier_flags: List[bool],
        trust_score: int
    ) -> Dict:
        """
        Generate machine-verifiable evidence bundle
        ERC-8004 compatible format
        """
        return {
            "version": "1.0.0",
            "validationId": validation_id,
            "timestamp": datetime.now().isoformat(),
            "trustScore": trust_score,
            "consensusReached": trust_score >= VALIDATION_THRESHOLD,
            "proofOfInference": {
                "workerCount": len(responses),
                "responses": [
                    {
                        "worker": r.worker,
                        "responseHash": r.response_hash,
                        "inferenceTimeMs": r.inference_time_ms,
                        "similarityScore": r.similarity_score,
                    }
                    for r in responses
                ],
            },
            "proofOfUsefulWork": {
                "semanticSimilarityMatrix": similarity_matrix.tolist(),
                "outlierFlags": outlier_flags,
                "avgSimilarity": float(similarity_matrix.mean()),
                "outlierCount": sum(outlier_flags),
            },
            "verification": {
                "method": "cortensor-poi-pouw",
                "algorithm": "cosine-similarity + outlier-detection",
                "threshold": VALIDATION_THRESHOLD,
            },
        }
    
    # ==================== Utilities ====================
    
    def get_validation_history(self) -> List[Dict]:
        """Get all validation history"""
        return self.validation_history
    
    def export_history(self, filepath: str):
        """Export validation history to JSON"""
        with open(filepath, 'w') as f:
            json.dump(self.validation_history, f, indent=2)
        print(f"📁 History exported to {filepath}")


# ==================== CLI Interface ====================
async def main():
    """Main entry point for the agent"""
    async with CortensorValidationAgent() as agent:
        
        # Example 1: Validate a research summary
        print("\n" + "="*60)
        print("Example 1: Research Ops Agent")
        print("="*60)
        
        trust_score = await agent.validate_output(
            "Summarize the latest advances in quantum computing for error correction"
        )
        
        # Example 2: DevOps validation
        print("\n" + "="*60)
        print("Example 2: DevOps Agent")
        print("="*60)
        
        trust_score = await agent.validate_output(
            "Analyze the security implications of the latest deployment"
        )
        
        # Example 3: Policy validation
        print("\n" + "="*60)
        print("Example 3: Deterministic Policy Test")
        print("="*60)
        
        trust_score = await agent.validate_output(
            "What is 2 + 2?"  # Should have perfect consensus
        )
        
        # Export history
        agent.export_history("validation_history.json")
        
        print("\n" + "="*60)
        print("✅ All validations complete!")
        print("="*60)


if __name__ == "__main__":
    asyncio.run(main())