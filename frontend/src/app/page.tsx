"use client";
import React, { useState } from "react";
import { ConnectButton, useCurrentAccount, useDisconnectWallet, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui.js/client";

const suiClient = new SuiClient({ 
  url: 'https://fullnode.mainnet.sui.io:443' 
});

export default function App() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [validationId, setValidationId] = useState("");
  const [step, setStep] = useState<"idle" | "inferring" | "validating" | "minting" | "complete">("idle");
  const [certificate, setCertificate] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [nftImage, setNftImage] = useState<string>("");

  const validate = async () => {
    if (!account || !prompt) return;
    
    setLoading(true);
    setStep("inferring");
    setResult(null);
    setCertificate(null);
    setError("");
    setNftImage("");

    try {
      console.log("📊 Step 1: Submitting to workers...");
      const r1 = await fetch("http://localhost:3000/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          userAddress: account.address 
        })
      });

      if (!r1.ok) {
        const errorData = await r1.json().catch(() => ({}));
        throw new Error(errorData.error || `Inference failed: ${r1.status}`);
      }
      
      const d1 = await r1.json();
      console.log("✅ Inference complete:", d1);
      setValidationId(d1.validationId);

      setTimeout(async () => {
        try {
          setStep("validating");
          console.log("🔍 Step 2: Validating responses...");
          
          const r2 = await fetch("http://localhost:3000/api/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validationId: d1.validationId })
          });

          if (!r2.ok) {
            const errorData = await r2.json().catch(() => ({}));
            throw new Error(errorData.error || `Validation failed: ${r2.status}`);
          }
          
          const d2 = await r2.json();
          console.log("✅ Validation complete:", d2);
          setResult(d2);
          
          if (d2.nftImageUrl) {
            setNftImage(d2.nftImageUrl);
          }

          if (d2.consensusReached && d2.trustScore >= 70) {
            setTimeout(async () => {
              try {
                setStep("minting");
                console.log("🎨 Step 3: Preparing to mint NFT...");

                const r3 = await fetch("http://localhost:3000/api/mint-certificate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    validationId: d1.validationId,
                    userAddress: account.address 
                  })
                });

                if (!r3.ok) {
                  const errorData = await r3.json().catch(() => ({}));
                  throw new Error(errorData.error || `Minting failed: ${r3.status}`);
                }
                
                const d3 = await r3.json();
                console.log("✅ Mint data received:", d3);

                if (d3.needsBuild) {
                  console.log("🔨 Building transaction on client side...");
                  
                  const tx = new Transaction();
                  const args = d3.transactionData.arguments;
                  
                  tx.moveCall({
                    target: d3.transactionData.target,
                    arguments: [
                      tx.pure.vector('u8', args.validationIdBytes),
                      tx.pure.u8(args.trustScore),
                      tx.pure.vector('u8', args.ipfsCidBytes),
                      tx.pure.vector('u8', args.promptBytes),
                      tx.pure.u64(args.timestamp),
                      tx.pure.address(args.recipient),
                    ],
                  });
                  
                  console.log("✍️ Requesting wallet signature...");
                  
                  try {
                    const txResult: any = await new Promise((resolve, reject) => {
                      signAndExecuteTransaction(
                        { transaction: tx },
                        {
                          onSuccess: resolve,
                          onError: reject
                        }
                      );
                    });
                    
                    console.log("✅ Transaction executed:", txResult.digest);
                    
                    const r4 = await fetch("http://localhost:3000/api/verify-mint", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        transactionDigest: txResult.digest,
                        validationId: d1.validationId
                      })
                    });
                    
                    const d4 = await r4.json();
                    console.log("✅ NFT verified:", d4);
                    setCertificate(d4);
                    setStep("complete");
                    setLoading(false);
                  } catch (txError: any) {
                    console.error("❌ Transaction error:", txError);
                    setError("Transaction failed: " + (txError.message || String(txError)));
                    setStep("complete");
                    setLoading(false);
                  }
                }
              } catch (mintError: any) {
                console.error("❌ Minting error:", mintError);
                setError("Minting failed: " + (mintError.message || String(mintError)));
                setStep("complete");
                setLoading(false);
              }
            }, 1500);
          } else {
            console.log("⚠️ Consensus not reached");
            setStep("complete");
            setLoading(false);
          }
        } catch (validationError: any) {
          console.error("❌ Validation error:", validationError);
          setError("Validation failed: " + (validationError.message || String(validationError)));
          setStep("idle");
          setLoading(false);
        }
      }, 2000);

    } catch (inferenceError: any) {
      console.error("❌ Inference error:", inferenceError);
      setError("Inference failed: " + (inferenceError.message || String(inferenceError)));
      setLoading(false);
      setStep("idle");
    }
  };

  const reset = () => {
    setPrompt("");
    setResult(null);
    setCertificate(null);
    setValidationId("");
    setStep("idle");
    setError("");
    setNftImage("");
  };

  const s1 = { minHeight: "100vh", background: "linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)", color: "white", padding: "2rem" };
  const s2 = { maxWidth: "900px", margin: "0 auto" };
  const s3 = { fontSize: "2.5rem", fontWeight: "bold", textAlign: "center" as const, marginBottom: "0.5rem" };
  const s4 = { textAlign: "center" as const, color: "#9ca3af", marginBottom: "1rem" };
  const s5 = { display: "inline-block", padding: "0.5rem 1rem", background: "rgba(34, 197, 94, 0.2)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "9999px", marginBottom: "2rem" };
  const s6 = { color: "#10b981", fontSize: "0.875rem" };
  const s7 = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", padding: "2rem", marginBottom: "1.5rem" };
  const s8 = { textAlign: "center" as const, padding: "3rem 0" };
  const s9 = { fontSize: "1.5rem", marginBottom: "1rem" };
  const s10 = { color: "#9ca3af", marginBottom: "1.5rem" };
  const s11 = { display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500" };
  const s12 = { width: "100%", height: "120px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "1rem", color: "white", marginBottom: "1rem", fontFamily: "inherit" };
  const s13 = { width: "100%", background: "linear-gradient(to right, #a855f7, #ec4899)", color: "white", fontWeight: "bold", padding: "1rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", marginBottom: "1rem" };
  const s14 = { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem", color: "#9ca3af" };
  const s15 = { background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.5rem 1rem", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.75rem" };

  return React.createElement("div", { style: s1 },
    React.createElement("div", { style: s2 },
      React.createElement("h1", { style: s3 }, "Trust Ops Agent"),
      React.createElement("p", { style: s4 }, "Decentralized AI Validation on Sui Mainnet"),
      React.createElement("div", { style: {...s5, textAlign: "center"} },
        React.createElement("span", { style: s6 }, "● Live on Mainnet • PoI + PoUW")
      ),
      
      error && React.createElement("div", { 
        style: { 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid rgba(239, 68, 68, 0.3)", 
          borderRadius: "0.5rem", 
          padding: "1rem",
          marginBottom: "1rem",
          color: "#ef4444"
        } 
      },
        React.createElement("div", { style: { fontWeight: "bold", marginBottom: "0.5rem" } }, "⚠️ Error"),
        React.createElement("div", { style: { fontSize: "0.875rem" } }, error),
        React.createElement("button", {
          onClick: () => setError(""),
          style: {
            marginTop: "0.5rem",
            padding: "0.25rem 0.75rem",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "0.25rem",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "0.75rem"
          }
        }, "Dismiss")
      ),
      
      React.createElement("div", { style: s7 },
        !account ? 
          React.createElement("div", { style: s8 },
            React.createElement("h2", { style: s9 }, "Connect Wallet"),
            React.createElement("p", { style: s10 }, "Connect your Sui wallet to validate AI outputs"),
            React.createElement(ConnectButton, null)
          ) :
          React.createElement("div", null,
            React.createElement("label", { style: s11 }, "AI Prompt to Validate"),
            React.createElement("textarea", {
              value: prompt,
              onChange: (e: any) => setPrompt(e.target.value),
              placeholder: "Enter AI-generated text to validate (e.g., 'What is machine learning?')...",
              style: s12,
              disabled: loading
            }),
            React.createElement("button", {
              onClick: validate,
              disabled: loading || !prompt,
              style: { 
                ...s13, 
                opacity: loading || !prompt ? 0.5 : 1, 
                cursor: loading || !prompt ? "not-allowed" : "pointer" 
              }
            }, 
              loading ? 
                (step === "inferring" ? "🔄 Multi-Worker Inference..." : 
                 step === "validating" ? "🔍 Analyzing Consensus..." : 
                 step === "minting" ? "🎨 Minting NFT Certificate..." : "Processing...") 
                : "🚀 Request Multi-Worker Validation"
            ),
            
            React.createElement("div", { style: s14 },
              React.createElement("span", null, "Connected: " + account.address.slice(0, 6) + "..." + account.address.slice(-4)),
              React.createElement("button", { onClick: () => disconnect(), style: s15 }, "Disconnect")
            )
          )
      ),

      loading && React.createElement("div", { 
        style: { 
          background: "rgba(168,85,247,0.1)", 
          border: "1px solid rgba(168,85,247,0.3)", 
          borderRadius: "1rem", 
          padding: "1.5rem",
          marginBottom: "1.5rem"
        } 
      },
        React.createElement("div", { style: { fontSize: "1rem", fontWeight: "bold", marginBottom: "1rem" } }, "🔄 Validation Progress"),
        React.createElement("div", { style: { display: "flex", gap: "1rem" } },
          ["inferring", "validating", "minting"].map((s) => 
            React.createElement("div", { 
              key: s,
              style: { 
                flex: 1, 
                padding: "0.75rem", 
                background: step === s ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)",
                border: step === s ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
                textAlign: "center" as const,
                fontSize: "0.875rem"
              }
            },
              React.createElement("div", null, 
                step === s ? "⚡" : 
                (s === "inferring" && (step === "validating" || step === "minting" || step === "complete")) ? "✅" :
                (s === "validating" && (step === "minting" || step === "complete")) ? "✅" :
                (s === "minting" && step === "complete") ? "✅" : "⏳"
              ),
              React.createElement("div", { style: { marginTop: "0.25rem" } },
                s === "inferring" ? "Workers" : s === "validating" ? "Consensus" : "NFT Mint"
              )
            )
          )
        )
      ),

      result && React.createElement("div", { 
        style: { 
          background: result.consensusReached ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", 
          border: result.consensusReached ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(245,158,11,0.2)", 
          borderRadius: "1rem", 
          padding: "1.5rem",
          marginBottom: "1.5rem"
        } 
      },
        React.createElement("h3", { style: { fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" } }, 
          result.consensusReached ? "✅ Validation Results" : "⚠️ Validation Results"
        ),
        
        nftImage && React.createElement("div", {
          style: { textAlign: "center" as const, marginBottom: "1.5rem" }
        },
          React.createElement("img", {
            src: nftImage,
            alt: "NFT Certificate Preview",
            style: {
              maxWidth: "300px",
              width: "100%",
              borderRadius: "1rem",
              border: "2px solid rgba(168,85,247,0.3)",
              boxShadow: "0 8px 32px rgba(168,85,247,0.2)"
            }
          })
        ),
        
        React.createElement("div", { 
          style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" } 
        },
          React.createElement("div", { 
            style: { background: "rgba(0,0,0,0.2)", borderRadius: "0.5rem", padding: "1.5rem", textAlign: "center" as const } 
          },
            React.createElement("p", { style: { fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" } }, "Trust Score"),
            React.createElement("p", { style: { fontSize: "3rem", fontWeight: "bold", color: result.trustScore >= 70 ? "#10b981" : "#f59e0b" } }, 
              result.trustScore
            ),
            React.createElement("p", { style: { fontSize: "0.75rem", color: "#6b7280" } }, "out of 100")
          ),
          React.createElement("div", { 
            style: { background: "rgba(0,0,0,0.2)", borderRadius: "0.5rem", padding: "1.5rem", textAlign: "center" as const } 
          },
            React.createElement("p", { style: { fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.5rem" } }, "Consensus"),
            React.createElement("p", { style: { fontSize: "2rem", fontWeight: "bold", color: result.consensusReached ? "#10b981" : "#f59e0b" } }, 
              result.consensusReached ? "✓ Reached" : "⚠ Review"
            ),
            React.createElement("p", { style: { fontSize: "0.75rem", color: "#6b7280" } }, 
              result.consensusReached ? "Ready for NFT" : "Threshold: 70/100"
            )
          )
        ),

        React.createElement("div", { style: { marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" } },
          React.createElement("p", { style: { fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.75rem", fontWeight: "bold" } }, "Score Breakdown:"),
          [
            { label: "Semantic Similarity", value: result.breakdown?.semanticSimilarity, max: 60 },
            { label: "Consensus Ratio", value: result.breakdown?.consensusRatio, max: 20 },
            { label: "Time Consistency", value: result.breakdown?.timeConsistency, max: 10 },
            { label: "Worker Reputation", value: result.breakdown?.workerReputation, max: 10 }
          ].map((item, i) =>
            React.createElement("div", { 
              key: i,
              style: { display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" } 
            },
              React.createElement("span", { style: { color: "#9ca3af" } }, item.label + ":"),
              React.createElement("span", { style: { fontWeight: "500" } }, `${item.value || 0}/${item.max}`)
            )
          )
        ),

        React.createElement("div", { style: { marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" } },
          React.createElement("p", { style: { fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.75rem", fontWeight: "bold" } }, "Evidence Bundle:"),
          React.createElement("div", { style: { fontSize: "0.75rem", color: "#6b7280" } },
            React.createElement("div", null, "📦 IPFS: ", result.evidenceBundle?.ipfsCid?.substring(0, 20) + "..."),
            React.createElement("div", null, "👥 Workers: ", result.evidenceBundle?.workerCount),
            React.createElement("div", null, "⚠️ Outliers: ", result.evidenceBundle?.outlierCount),
            React.createElement("div", null, "📊 Avg Similarity: ", result.evidenceBundle?.avgSimilarity + "%")
          )
        )
      ),

      certificate && React.createElement("div", { 
        style: { 
          background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))", 
          border: "2px solid rgba(168,85,247,0.4)", 
          borderRadius: "1rem", 
          padding: "2rem",
          textAlign: "center" as const
        } 
      },
        React.createElement("div", { style: { fontSize: "3rem", marginBottom: "1rem" } }, "🏆"),
        React.createElement("h3", { style: { fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" } }, "NFT Certificate Minted!"),
        React.createElement("p", { style: { color: "#9ca3af", marginBottom: "1.5rem", fontSize: "0.875rem" } }, 
          "Your Trust Score has been permanently recorded on Sui"
        ),
        
        certificate.nftImageUrl && React.createElement("div", { style: { marginBottom: "1.5rem" } },
          React.createElement("img", {
            src: certificate.nftImageUrl,
            alt: "Minted NFT",
            style: {
              maxWidth: "400px",
              width: "100%",
              borderRadius: "1rem",
              border: "3px solid rgba(168,85,247,0.5)",
              boxShadow: "0 12px 48px rgba(168,85,247,0.3)"
            }
          })
        ),
        
        React.createElement("div", { style: { background: "rgba(0,0,0,0.3)", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem" } },
          React.createElement("div", { style: { fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.25rem" } }, "NFT Object ID"),
          React.createElement("div", { style: { fontSize: "0.875rem", fontFamily: "monospace", wordBreak: "break-all" } }, 
            certificate.nftId?.substring(0, 30) + "..."
          )
        ),
        
        React.createElement("div", { style: { display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" } },
          certificate.explorerUrl && React.createElement("a", { 
            href: certificate.explorerUrl, 
            target: "_blank",
            style: { 
              display: "inline-block",
              background: "linear-gradient(to right, #a855f7, #ec4899)", 
              color: "white", 
              padding: "0.75rem 1.5rem", 
              borderRadius: "0.5rem", 
              textDecoration: "none",
              fontWeight: "bold"
            }
          }, "View Transaction →"),
          certificate.nftExplorerUrl && React.createElement("a", { 
            href: certificate.nftExplorerUrl, 
            target: "_blank",
            style: { 
              display: "inline-block",
              background: "rgba(168,85,247,0.2)", 
              color: "white", 
              padding: "0.75rem 1.5rem", 
              borderRadius: "0.5rem", 
              textDecoration: "none",
              fontWeight: "bold",
              border: "1px solid rgba(168,85,247,0.5)"
            }
          }, "View NFT →")
        ),
        
        React.createElement("button", {
          onClick: reset,
          style: {
            display: "block",
            width: "100%",
            marginTop: "1rem",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer"
          }
        }, "Validate Another Prompt")
      )
    )
  );
}