"use client";
import { useState, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../lib/contract";
import styles from "./page.module.css";

export default function Home() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();
  const { address, isConnected } = useAccount();
  const [streak, setStreak] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [checkInFee, setCheckInFee] = useState<bigint>(BigInt(0));

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Read contract state with refetch interval
  const { data: canCheckInToday, refetch: refetchCanCheckIn } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "canCheckInToday",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
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
      enabled: !!address,
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
      enabled: !!address,
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

  // Update local state from contract
  useEffect(() => {
    if (address) {
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
        if (newStreak !== streak) {
          setPreviousStreak(streak);
        }
        setStreak(newStreak);
      } else {
        // For new users, set to 0 explicitly
        setStreak(0);
        setPreviousStreak(0);
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
      setPreviousStreak(0);
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
  }, [address, canCheckInToday, contractStreak, lastCheckInTimestamp, fee]);

  // Force refetch when address changes
  useEffect(() => {
    if (address) {
      // Small delay to ensure wallet is connected
      const timer = setTimeout(() => {
        refetchCanCheckIn();
        refetchStreak();
        refetchLastCheckIn();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [address, refetchCanCheckIn, refetchStreak, refetchLastCheckIn]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleCheckIn = async () => {
    if (!address || !canCheckIn) return;

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

  // Save activity and refresh data after successful transaction
  useEffect(() => {
    if (isSuccess && address && hash) {
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
          message: `Checked in! Day ${estimatedStreak} streak`,
        };

        const existingActivities = localStorage.getItem(`activities_${address}`);
        const activities = existingActivities ? JSON.parse(existingActivities) : [];
        activities.push(activityItem);

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
            message: `🏆 Earned badge: ${badgeNames[estimatedStreak]}!`,
            badgeName: badgeNames[estimatedStreak],
          };
          activities.push(badgeActivity);
        }

        localStorage.setItem(`activities_${address}`, JSON.stringify(activities));

        // Trigger page refresh to show updated data
        // Use a shorter delay to ensure localStorage is saved
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };

      saveActivity();
    }
  }, [isSuccess, address, hash, streak]);

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
      </div>
    </div>
  );
}
