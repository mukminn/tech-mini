"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import styles from "./page.module.css";

interface ActivityItem {
  id: string;
  date: Date;
  type: "checkin" | "badge";
  message: string;
  badgeName?: string;
}

export default function ActivityPage() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Load activities from localStorage when address is available
  useEffect(() => {
    const loadActivities = () => {
      if (address) {
        const stored = localStorage.getItem(`activities_${address}`);
        if (stored) {
          try {
            const parsed: ActivityItem[] = JSON.parse(stored).map((item: { id: string; date: string; type: string; message: string; badgeName?: string }) => ({
              id: item.id,
              date: new Date(item.date),
              type: item.type as "checkin" | "badge",
              message: item.message,
              badgeName: item.badgeName,
            }));
            setActivities(parsed.sort((a: ActivityItem, b: ActivityItem) => 
              b.date.getTime() - a.date.getTime()
            ));
          } catch (error) {
            console.error("Error parsing activities:", error);
            setActivities([]);
          }
        } else {
          setActivities([]);
        }
      } else {
        setActivities([]);
      }
    };

    // Load immediately when address changes
    loadActivities();
    
    // Refresh every 3 seconds
    const interval = setInterval(() => {
      loadActivities();
    }, 3000);

    // Also refresh when window gets focus (user switches back to tab)
    const handleFocus = () => {
      loadActivities();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [address]);

  if (activities.length === 0) {
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
          <h1 className={styles.title}>Activity</h1>
          <p className={styles.subtitle}>Your check-in history</p>
        </div>
        <div className={styles.emptyState}>
          <p>No activity yet</p>
          <p className={styles.emptySubtext}>Complete your first check-in to see activity here</p>
        </div>
      </div>
    );
  }

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
        <h1 className={styles.title}>Activity</h1>
        <p className={styles.subtitle}>Your check-in history</p>
      </div>

      <div className={styles.timeline}>
        {activities.map((activity, index) => (
          <div key={activity.id} className={styles.timelineItem}>
            <div className={styles.timelineDot}>
              {activity.type === "badge" ? "🏆" : "✓"}
            </div>
            <div className={styles.timelineContent}>
              <p className={styles.activityMessage}>{activity.message}</p>
              <p className={styles.activityDate}>
                {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {index < activities.length - 1 && <div className={styles.timelineLine} />}
          </div>
        ))}
      </div>
    </div>
  );
}
