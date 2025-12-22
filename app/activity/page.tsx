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

  useEffect(() => {
    if (address) {
      // Fetch from localStorage (will be populated after check-in)
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
        }
      }
    }
  }, [address]);

  // Refresh activities when address changes or periodically
  useEffect(() => {
    if (address) {
      const interval = setInterval(() => {
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
          }
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [address]);

  if (activities.length === 0) {
    return (
      <div className={styles.container}>
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
