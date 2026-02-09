```typescript
'use client';

import React, { useState } from 'react';
import { ConnectButton, useWallet } from '@mysten/dapp-kit';
import { Upload, CheckCircle, AlertCircle, Loader2, Shield, Database, TrendingUp, Sparkles } from 'lucide-react';

export default function CortensorApp() {
  const { connected, currentAccount } = useWallet();
  
  const [prompt, setPrompt] = useState('');
  const [validationId, setValidationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [txHash, setTxHash] = useState('');

  const handleInfer = async () => {
    if (!connected || !prompt) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      setValidationId(data.validationId);
      setTxHash(data.transactionHash);
      
      setTimeout(() => handleValidate(data.validationId), 2000);
      
    } catch (error) {
      console.error('Inference error:', error);
      alert('Failed to request inference.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (vId = validationId) => {
    if (!vId) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationId: vId }),
      });
      
      const data = await response.json();
      setResult(data);
      setTxHash(data.transactionHash);
      
    } catch (error) {
      console.error('Validation error:', error);
      alert('Failed to validate.');
    } finally {
      setLoading(false);
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Cortensor</h1>
                <p className="text-xs text-gray-400">Decentralized AI Validation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <span className="text-xs text-green-400 font-medium">● Sui Mainnet</span>
              </div>
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Turn AI Outputs into Verifiable Trust
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Leverage decentralized inference and PoUW scoring to validate AI responses with on-chain proof
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">12.4K</span>
            </div>
            <p className="text-sm text-gray-400">Validations</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white">87%</span>
            </div>
            <p className="text-sm text-gray-400">Avg Trust Score</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">3+</span>
            </div>
            <p className="text-sm text-gray-400">Active Workers</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold text-white">99.2%</span>
            </div>
            <p className="text-sm text-gray-400">Consensus Rate</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {!connected ? (
            <div className="text-center py-16">
              <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
              <p className="text-gray-400 mb-6">Connect your Sui wallet to start validating AI outputs</p>
              <ConnectButton />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Prompt / Output to Validate
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the AI-generated text you want to validate..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <button
                onClick={handleInfer}
                disabled={loading || !prompt}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Request Multi-Worker Validation</span>
                  </>
                )}
              </button>

              {result && (
                <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Validation Results</h3>
                    {result.consensusReached ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-400" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/20 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Trust Score</p>
                      <p className={`text-3xl font-bold ${getTrustColor(result.trustScore)}`}>
                        {result.trustScore}/100
                      </p>
                    </div>
                    
                    <div className="bg-black/20 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Consensus</p>
                      <p className={`text-lg font-semibold ${
                        result.consensusReached ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {result.consensusReached ? '✓ Reached' : '⚠ Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Worker Count:</span>
                      <span className="text-white font-medium">{result.evidenceBundle?.workerCount || 3}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Outliers:</span>
                      <span className="text-white font-medium">{result.evidenceBundle?.outlierCount || 0}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Avg Similarity:</span>
                      <span className="text-white font-medium">{result.evidenceBundle?.avgSimilarity || 92}%</span>
                    </div>
                  </div>

                  {txHash && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <p className="text-sm text-gray-400 mb-2">Transaction Hash:</p>
                      
                        href={`https://suiscan.xyz/mainnet/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm font-mono break-all"
                      >
                        {txHash}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```