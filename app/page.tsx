"use client";
import { useState, useEffect, useRef } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../lib/contract";
import { encodeFunctionData } from "viem";
import styles from "./page.module.css";

export default function Home() {
  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453;
  const isCorrectChain = chainId === expectedChainId;
  const activityKey = address ? `activities_${address.toLowerCase()}` : "";
  const TOKEN_ADDRESS = "0xEF5997c2cf2f6c138196f8A6203afc335206b3c1" as const;
  const DEFAULT_TOKEN_RECIPIENT = "0xc76b7F5BC0FDeD34c035f4dF38A8A771E4FEb87A" as const;
  const PAYMASTER_URL = "https://paymaster.base.org/api/v1/sponsor" as const;

  const ERC20_ABI = [
    {
      type: "function",
      name: "transfer",
      stateMutability: "nonpayable",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
    {
      type: "function",
      name: "decimals",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint8" }],
    },
    {
      type: "function",
      name: "symbol",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "string" }],
    },
  ] as const;

  const [streak, setStreak] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [checkInFee, setCheckInFee] = useState<bigint>(BigInt(0));
  const lastSavedTxHashRef = useRef<`0x${string}` | null>(null);

  const [tokenRecipient, setTokenRecipient] = useState<string>(DEFAULT_TOKEN_RECIPIENT);
  const [isSendingToken, setIsSendingToken] = useState(false);
  const [tokenTxHash, setTokenTxHash] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Read contract state with refetch interval
  const { data: canCheckInToday, refetch: refetchCanCheckIn } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "canCheckInToday",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isCorrectChain,
      refetchInterval: 10000, // Refetch every 10 seconds
      refetchOnWindowFocus: true,
    },
  });

  const { data: contractStreak, refetch: refetchStreak } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getStreak",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isCorrectChain,
      refetchInterval: 10000, // Refetch every 10 seconds
      refetchOnWindowFocus: true,
    },
  });

  const { data: lastCheckInTimestamp, refetch: refetchLastCheckIn } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "lastCheckInDay",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isCorrectChain,
      refetchInterval: 10000, // Refetch every 10 seconds
      refetchOnWindowFocus: true,
    },
  });

  // Read check-in fee
  const { data: fee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getCheckInFee",
    query: {
      enabled: true,
    },
  });

  const { data: tokenDecimals } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: true,
      staleTime: 60_000,
    },
  });

  const { data: tokenSymbol } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: true,
      staleTime: 60_000,
    },
  });

  // Update local state from contract
  useEffect(() => {
    if (address && isCorrectChain) {
      // Always update canCheckIn, even if false (for new users, this will be true)
      if (canCheckInToday !== undefined && typeof canCheckInToday === 'boolean') {
        setCanCheckIn(canCheckInToday);
      } else {
        // For new users, default to true (can check in)
        setCanCheckIn(true);
      }
      
      // Always update streak - handle both 0 and undefined for new users
      if (contractStreak !== undefined && contractStreak !== null) {
        const newStreak = Number(contractStreak);
        // Only update previousStreak if streak actually changed
        setStreak((_prevStreak) => {
          return newStreak;
        });
      } else {
        // For new users, set to 0 explicitly
        setStreak(0);
      }
      
      // Update last check-in date
      if (lastCheckInTimestamp !== undefined && lastCheckInTimestamp !== null) {
        const timestampValue = Number(lastCheckInTimestamp);
        if (timestampValue > 0) {
          const timestamp = timestampValue * 1000; // Convert to milliseconds
          setLastCheckIn(new Date(timestamp));
        } else {
          // For new users, no last check-in
          setLastCheckIn(null);
        }
      } else {
        // For new users, no last check-in
        setLastCheckIn(null);
      }
    } else {
      // Reset when no address
      setStreak(0);
      setLastCheckIn(null);
      setCanCheckIn(false);
    }
    
    // Update fee (always, not dependent on address)
    if (fee !== undefined && fee !== null) {
      setCheckInFee(BigInt(fee.toString()));
    } else {
      // Default fee if not loaded yet
      setCheckInFee(BigInt(0));
    }
  }, [address, canCheckInToday, contractStreak, lastCheckInTimestamp, fee, isCorrectChain]);

  // Force refetch when address changes
  useEffect(() => {
    if (address && isCorrectChain) {
      // Small delay to ensure wallet is connected
      const timer = setTimeout(() => {
        refetchCanCheckIn();
        refetchStreak();
        refetchLastCheckIn();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [address, isCorrectChain, refetchCanCheckIn, refetchStreak, refetchLastCheckIn]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleCheckIn = async () => {
    if (!address || !canCheckIn) return;
    if (!isCorrectChain) {
      alert(`Wrong network. Please switch to chainId ${expectedChainId}.`);
      return;
    }

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "checkIn",
        value: checkInFee,
        gas: undefined, // Let OnchainKit handle gas sponsorship
      });
    } catch (error) {
      console.error("Check-in error:", error);
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Transaction failed: ${error.message}`);
      } else {
        alert("Transaction failed. Please try again.");
      }
    }
  };

  const handleSendToken = async () => {
    if (!address) return;
    if (!isCorrectChain) {
      alert(`Wrong network. Please switch to chainId ${expectedChainId}.`);
      return;
    }

    setTokenError(null);
    setTokenTxHash(null);

    const decimalsNumber = typeof tokenDecimals === "number" ? tokenDecimals : Number(tokenDecimals ?? 18);
    const amount = BigInt(10) ** BigInt(decimalsNumber);
    const to = tokenRecipient?.trim();

    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
      setTokenError("Recipient address invalid.");
      return;
    }

    const provider = (window as unknown as { ethereum?: any }).ethereum;
    if (!provider?.request) {
      setTokenError("Sponsored wallet provider not available.");
      return;
    }

    setIsSendingToken(true);
    try {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, amount],
      });

      const calls = [
        {
          to: TOKEN_ADDRESS,
          data,
          value: "0x0",
        },
      ];

      const res = await provider.request({
        method: "wallet_sendCalls",
        params: [
          {
            version: "1.0",
            from: address,
            calls,
            capabilities: {
              paymasterUrl: PAYMASTER_URL,
            },
          },
        ],
      });

      if (typeof res === "string") {
        setTokenTxHash(res);
      } else {
        setTokenTxHash("sent");
      }
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Token send failed.";
      setTokenError(msg);
    } finally {
      setIsSendingToken(false);
    }
  };

  // Save activity and refresh data after successful transaction
  useEffect(() => {
    if (isSuccess && address && hash) {
      if (lastSavedTxHashRef.current === hash) return;
      lastSavedTxHashRef.current = hash;
      // Wait for contract state to update (blockchain confirmation)
      const saveActivity = async () => {
        // Wait longer for contract state to be confirmed
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to read updated streak from contract
        // For now, use estimated streak (will be updated by contract read)
        const estimatedStreak = streak + 1;
        
        // Save check-in activity to localStorage immediately
        const activityItem = {
          id: `checkin-${Date.now()}-${hash}`,
          date: new Date().toISOString(),
          type: "checkin" as const,
          txHash: hash,
          message: `Checked in! Day ${estimatedStreak} streak`,
        };

        const existingActivities = localStorage.getItem(activityKey);
        const activities = existingActivities ? JSON.parse(existingActivities) : [];
        const alreadyHasTx = Array.isArray(activities)
          ? activities.some((a: any) => a?.txHash === hash && a?.type === "checkin")
          : false;
        if (!alreadyHasTx) activities.push(activityItem);

        // Check if badge was earned (milestone days: 1, 3, 7, 14)
        const badgeMilestones = [1, 3, 7, 14];
        if (badgeMilestones.includes(estimatedStreak)) {
          const badgeNames: Record<number, string> = {
            1: "First Check-in",
            3: "3 Day Starter",
            7: "Week Warrior",
            14: "2 Week Champion",
          };
          
          const badgeActivity = {
            id: `badge-${Date.now()}-${estimatedStreak}`,
            date: new Date().toISOString(),
            type: "badge" as const,
            txHash: hash,
            message: `🏆 Earned badge: ${badgeNames[estimatedStreak]}!`,
            badgeName: badgeNames[estimatedStreak],
          };
          const alreadyHasBadgeTx = Array.isArray(activities)
            ? activities.some((a: any) => a?.txHash === hash && a?.type === "badge")
            : false;
          if (!alreadyHasBadgeTx) activities.push(badgeActivity);
        }

        localStorage.setItem(activityKey, JSON.stringify(activities));

        try {
          window.dispatchEvent(new Event("activities_updated"));
        } catch {
          // ignore
        }

        setCanCheckIn(false);
        setStreak((prev) => {
          return Math.max(prev, estimatedStreak);
        });
        setLastCheckIn(new Date());

        setTimeout(() => {
          refetchCanCheckIn();
          refetchStreak();
          refetchLastCheckIn();
        }, 600);
      };

      saveActivity();
    }
  }, [isSuccess, address, activityKey, hash, isCorrectChain, streak, refetchCanCheckIn, refetchStreak, refetchLastCheckIn]);

  const getNextBadge = () => {
    if (streak >= 14) return null;
    if (streak >= 7) return { day: 14, name: "2 Week Champion" };
    if (streak >= 3) return { day: 7, name: "Week Warrior" };
    if (streak >= 1) return { day: 3, name: "3 Day Starter" };
    return { day: 1, name: "First Check-in" };
  };

  const nextBadge = getNextBadge();

  return (
    <div className={styles.container}>
      <img src="/sphere.png" alt="" className={styles.decorativeSphere} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere2} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere3} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere4} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere5} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere6} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere7} aria-hidden="true" />
      <img src="/sphere.png" alt="" className={styles.decorativeSphere8} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.greeting}>
            Hey {context?.user?.displayName || "there"}!
          </h1>
          <p className={styles.subtitle}>Complete your daily check-in</p>
        </div>

        <div className={styles.streakCard}>
          <div className={styles.streakNumber}>{streak}</div>
          <div className={styles.streakLabel}>Day Streak</div>
          {lastCheckIn && (
            <div className={styles.lastCheckIn}>
              Last: {lastCheckIn.toLocaleDateString()}
            </div>
          )}
        </div>

        {nextBadge && (
          <div className={styles.nextBadgeCard}>
            <p className={styles.nextBadgeLabel}>Next Badge</p>
            <p className={styles.nextBadgeName}>{nextBadge.name}</p>
            <p className={styles.nextBadgeProgress}>
              {streak} / {nextBadge.day} days
            </p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(streak / nextBadge.day) * 100}%` }}
              />
            </div>
          </div>
        )}

        {checkInFee > BigInt(0) && (
          <div className={styles.feeInfo}>
            <p className={styles.feeLabel}>Check-in Fee:</p>
            <p className={styles.feeAmount}>
              {(Number(checkInFee) / 1e18).toFixed(4)} ETH
            </p>
          </div>
        )}

        <button
          onClick={handleCheckIn}
          disabled={!canCheckIn || !isConnected || isPending || isConfirming}
          className={`${styles.checkInButton} ${!canCheckIn ? styles.disabled : ""}`}
        >
          {isPending || isConfirming
            ? "Processing..."
            : !canCheckIn
            ? "Already Checked In Today"
            : "Complete Today"}
        </button>

        {isSuccess && (
          <div className={styles.successMessage}>
            ✅ Check-in successful! Keep your streak going!
          </div>
        )}

        <div style={{ width: "100%", marginTop: 16 }}>
          <div style={{ opacity: 0.9, fontSize: 12, marginBottom: 8 }}>
            Send 1 {(typeof tokenSymbol === "string" && tokenSymbol) || "TOKEN"}
          </div>
          <input
            value={tokenRecipient}
            onChange={(e) => setTokenRecipient(e.target.value)}
            placeholder={DEFAULT_TOKEN_RECIPIENT}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "inherit",
              outline: "none",
              marginBottom: 10,
            }}
          />
          <button
            onClick={handleSendToken}
            disabled={!isConnected || !isCorrectChain || isSendingToken}
            className={`${styles.checkInButton} ${!isConnected ? styles.disabled : ""}`}
            style={{ marginTop: 0 }}
          >
            {isSendingToken ? "Sending (Sponsored)..." : "Send 1 Token (Sponsored)"}
          </button>
          {tokenTxHash && (
            <div className={styles.successMessage} style={{ marginTop: 10 }}>
              ✅ Token sent!
            </div>
          )}
          {tokenError && (
            <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 12 }}>
              {tokenError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
