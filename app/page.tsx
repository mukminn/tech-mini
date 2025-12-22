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

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Read contract state
  const { data: canCheckInToday } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "canCheckInToday",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: contractStreak } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getStreak",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: lastCheckInTimestamp } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "lastCheckInDay",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Update local state from contract
  useEffect(() => {
    if (address) {
      if (canCheckInToday !== undefined && typeof canCheckInToday === 'boolean') {
        setCanCheckIn(canCheckInToday);
      }
      if (contractStreak !== undefined && contractStreak !== null) {
        const newStreak = Number(contractStreak);
        setPreviousStreak(streak);
        setStreak(newStreak);
      }
      if (lastCheckInTimestamp !== undefined && lastCheckInTimestamp !== null && Number(lastCheckInTimestamp) > 0) {
        const timestamp = Number(lastCheckInTimestamp) * 1000; // Convert to milliseconds
        setLastCheckIn(new Date(timestamp));
      }
    }
  }, [address, canCheckInToday, contractStreak, lastCheckInTimestamp]);

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
      // Wait a bit for contract state to update
      setTimeout(async () => {
        // Get updated streak from contract
        const updatedStreak = contractStreak ? Number(contractStreak) + 1 : streak + 1;
        
        // Save check-in activity to localStorage
        const activityItem = {
          id: `checkin-${Date.now()}-${hash}`,
          date: new Date().toISOString(),
          type: "checkin" as const,
          message: `Checked in! Day ${updatedStreak} streak`,
        };

        const existingActivities = localStorage.getItem(`activities_${address}`);
        const activities = existingActivities ? JSON.parse(existingActivities) : [];
        activities.push(activityItem);

        // Check if badge was earned (milestone days: 1, 3, 7, 14)
        const badgeMilestones = [1, 3, 7, 14];
        if (badgeMilestones.includes(updatedStreak)) {
          const badgeNames: Record<number, string> = {
            1: "First Check-in",
            3: "3 Day Starter",
            7: "Week Warrior",
            14: "2 Week Champion",
          };
          
          const badgeActivity = {
            id: `badge-${Date.now()}-${updatedStreak}`,
            date: new Date().toISOString(),
            type: "badge" as const,
            message: `🏆 Earned badge: ${badgeNames[updatedStreak]}!`,
            badgeName: badgeNames[updatedStreak],
          };
          activities.push(badgeActivity);
        }

        localStorage.setItem(`activities_${address}`, JSON.stringify(activities));

        // Reload to show updated data
        window.location.reload();
      }, 3000);
    }
  }, [isSuccess, address, hash, streak, contractStreak]);

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
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.greeting}>
            Hey {context?.user?.displayName || "there"}! 👋
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
