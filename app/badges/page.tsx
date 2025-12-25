"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI, BADGE_IDS } from "../../lib/contract";
import styles from "./page.module.css";

interface Badge {
  id: number;
  name: string;
  description: string;
  day: number;
  unlocked: boolean;
  image?: string;
}

const BADGES: Badge[] = [
  { id: 1, name: "First Check-in", description: "Complete your first daily check-in", day: 1, unlocked: false, image: "/badge-day-1.png" },
  { id: 2, name: "3 Day Starter", description: "Check in for 3 consecutive days", day: 3, unlocked: false, image: "/badge-day-3.png" },
  { id: 3, name: "Week Warrior", description: "Check in for 7 consecutive days", day: 7, unlocked: false, image: "/badge-day-7.png" },
  { id: 4, name: "2 Week Champion", description: "Check in for 14 consecutive days", day: 14, unlocked: false, image: "/badge-day-14.png" },
];

export default function BadgesPage() {
  const { address } = useAccount();
  const [badges, setBadges] = useState<Badge[]>(BADGES);
  const [streak, setStreak] = useState(0);

  // Read streak from contract with refetch
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

  // Read badge balances from contract with refetch
  const { data: badge1, refetch: refetchBadge1 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "balanceOf",
    args: address ? [address, BADGE_IDS.DAY_1] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    },
  });

  const { data: badge3, refetch: refetchBadge3 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "balanceOf",
    args: address ? [address, BADGE_IDS.DAY_3] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    },
  });

  const { data: badge7, refetch: refetchBadge7 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "balanceOf",
    args: address ? [address, BADGE_IDS.DAY_7] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    },
  });

  const { data: badge14, refetch: refetchBadge14 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "balanceOf",
    args: address ? [address, BADGE_IDS.DAY_14] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    },
  });

  useEffect(() => {
    if (address) {
      // Always update streak, even if it's 0 or undefined (for new users)
      if (contractStreak !== undefined && contractStreak !== null) {
        const streakCount = Number(contractStreak);
        setStreak(streakCount);
      } else {
        // For new users, explicitly set to 0
        setStreak(0);
      }

      // Update badge unlock status based on contract balances
      // This should run even if badge data is still loading (will be false for new users)
      setBadges(BADGES.map((badge, index) => {
        let hasBadge = false;
        const checkBadge = (value: unknown): boolean => {
          if (value === undefined || value === null) return false;
          try {
            const bigIntValue = typeof value === 'bigint' ? value : BigInt(String(value));
            return bigIntValue > BigInt(0);
          } catch {
            return false;
          }
        };
        if (index === 0) hasBadge = checkBadge(badge1);
        if (index === 1) hasBadge = checkBadge(badge3);
        if (index === 2) hasBadge = checkBadge(badge7);
        if (index === 3) hasBadge = checkBadge(badge14);

        return {
          ...badge,
          unlocked: hasBadge,
        };
      }));
    } else {
      // Reset when no address
      setStreak(0);
      setBadges(BADGES.map(badge => ({ ...badge, unlocked: false })));
    }
  }, [address, contractStreak, badge1, badge3, badge7, badge14]);

  // Force refetch when address changes
  useEffect(() => {
    if (address) {
      // Small delay to ensure wallet is connected
      const timer = setTimeout(() => {
        refetchStreak();
        refetchBadge1();
        refetchBadge3();
        refetchBadge7();
        refetchBadge14();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [address, refetchStreak, refetchBadge1, refetchBadge3, refetchBadge7, refetchBadge14]);

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
      <div className={styles.header}>
        <h1 className={styles.title}>Badges</h1>
        <p className={styles.subtitle}>Earn badges by maintaining your streak</p>
      </div>

      <div className={styles.badgesGrid}>
        {badges.map((badge, index) => (
          <div
            key={badge.id}
            className={`${styles.badgeCard} ${badge.unlocked ? styles.unlocked : styles.locked}`} style={{ "--index": index } as React.CSSProperties}
          >
            <div className={styles.badgeIcon}>
              {badge.unlocked ? (
                badge.image ? (
                  <img src={badge.image} alt={badge.name} className={styles.badgeImage} />
                ) : (
                  <div className={styles.badgeIconUnlocked}>🏆</div>
                )
              ) : (
                <div className={styles.badgeIconLocked}>🔒</div>
              )}
            </div>
            <h3 className={styles.badgeName}>{badge.name}</h3>
            <p className={styles.badgeDescription}>{badge.description}</p>
            <div className={styles.badgeDay}>Day {badge.day}</div>
            {!badge.unlocked && streak > 0 && (
              <div className={styles.badgeProgress}>
                {streak} / {badge.day} days
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

