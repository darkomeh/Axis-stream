import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications } from '../services/notificationService';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
import { getSubscribedMatches } from '../services/sportsNotificationService';

export default function NotificationListener() {
  const { user, stats } = useAuth();
  const { showToast } = useToast();
  const isFirstLoad = useRef(true);
  const knownNotificationIds = useRef<Set<string>>(new Set());

  const lastMatchesRef = useRef<Record<string, { status: string, home_score: string, away_score: string }>>({});
  const notifiedUpcomingRef = useRef<Set<string>>(new Set());

  // Background Sports Match Notification Poller
  useEffect(() => {
    const checkSubscribedMatches = async () => {
      try {
        const response = await axios.get('/api/matches?sport=all');
        const matches = response.data.matches || [];
        const subs = getSubscribedMatches();

        matches.forEach((match: any) => {
          const matchId = String(match.id);
          const prevState = lastMatchesRef.current[matchId];
          const isSubbed = subs.includes(matchId);

          if (isSubbed) {
            // 1. Kickoff schedule check (1 minute before scheduled start)
            if (match.status === "UPCOMING" && match.start_time) {
              const targetTime = new Date(match.start_time).getTime();
              const now = Date.now();
              if (now >= targetTime - 60000 && !notifiedUpcomingRef.current.has(matchId)) {
                notifiedUpcomingRef.current.add(matchId);
                const title = `⏰ MATCH STARTING SOON!`;
                const msg = `${match.home_team} vs ${match.away_team} is about to kick off!`;
                
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(title, {
                    body: msg,
                    icon: match.home_logo || 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg',
                    tag: `match-upcoming-${matchId}`
                  });
                }
                showToast(msg, 'info');
              }
            }

            // 2. Status change check (UPCOMING -> LIVE)
            if (prevState && prevState.status === "UPCOMING" && match.status === "LIVE") {
              const title = `🔥 MATCH IS LIVE!`;
              const msg = `${match.home_team} vs ${match.away_team} has started! Watch now.`;
              
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(title, {
                  body: msg,
                  icon: match.home_logo || 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg',
                  tag: `match-live-${matchId}`
                });
              }
              showToast(msg, 'info');
            }

            // 3. Goal check
            if (prevState && match.status === "LIVE") {
              const prevHome = parseInt(prevState.home_score) || 0;
              const prevAway = parseInt(prevState.away_score) || 0;
              const currHome = parseInt(match.home_score) || 0;
              const currAway = parseInt(match.away_score) || 0;

              if (currHome > prevHome || currAway > prevAway) {
                const title = `⚽ GOAL SCORED!`;
                const msg = `${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`;
                
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(title, {
                    body: msg,
                    icon: 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg',
                    tag: `match-goal-${matchId}-${match.home_score}-${match.away_score}`
                  });
                }
                showToast(msg, 'success');
              }
            }
          }

          // Always save current state for comparison
          lastMatchesRef.current[matchId] = {
            status: match.status,
            home_score: match.home_score,
            away_score: match.away_score
          };
        });
      } catch (err) {
        console.warn("Background sports matches check failed:", err);
      }
    };

    // Run initially and then every 15 seconds
    checkSubscribedMatches();
    const interval = setInterval(checkSubscribedMatches, 15000);
    return () => clearInterval(interval);
  }, [showToast]);

  // Request notification and microphone permissions on site entry
  useEffect(() => {
    // 1. Request Notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
          .then((perm) => {
            console.log('Notification permission status:', perm);
            if (perm === 'granted') {
              showToast('System notifications enabled!', 'success');
            }
          })
          .catch((err) => {
            console.error('Error requesting notification permission:', err);
          });
      }
    }

    // 2. Request Microphone permission
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          // Release microphone tracks immediately as we only want permission authorization
          stream.getTracks().forEach(track => track.stop());
          console.log('Microphone permission authorized successfully.');
        })
        .catch((err) => {
          console.warn('Microphone permission query dismissed or denied:', err);
        });
    }
  }, []);

  // Periodic watch streak reminder (5 hours before end of day)
  useEffect(() => {
    if (!user || !stats) return;

    const checkStreakReminder = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      // If user already watched today, no reminder needed
      if (stats.lastWatchDate === today) return;

      // 5 hours before the end of the day is 19:00 (7 PM)
      const currentHour = now.getHours();
      if (currentHour >= 19 && currentHour < 24) {
        const warningKey = `streak_warning_${user.id}_${today}`;
        if (!localStorage.getItem(warningKey)) {
          localStorage.setItem(warningKey, 'true');

          const remainingHours = 24 - currentHour;
          const streakCount = stats.currentStreak || 0;
          const msg = streakCount > 0
            ? `Only ${remainingHours} hours left to keep your ${streakCount}-day streak alive! 🔥`
            : `Only ${remainingHours} hours left to start a new daily watch streak today! 🔥`;

          // Show OS notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification("Don't Lose Your Streak! 🎬", {
                body: msg,
                icon: 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg',
                tag: 'streak-warning'
              });
            } catch (e) {
              console.warn('Error creating local OS notification:', e);
            }
          }

          // Show in-app toast
          showToast(msg, 'info');
        }
      }
    };

    // Check immediately on load and then every 5 minutes
    checkStreakReminder();
    const interval = setInterval(checkStreakReminder, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, stats, showToast]);

  useEffect(() => {
    if (!user?.id) {
      isFirstLoad.current = true;
      knownNotificationIds.current = new Set();
      return;
    }

    const unsubscribe = subscribeToNotifications(user.id, (notifications) => {
      if (isFirstLoad.current) {
        // Just populate known ids on first load
        notifications.forEach(n => knownNotificationIds.current.add(n.id));
        isFirstLoad.current = false;
        return;
      }

      // Check for new notifications
      notifications.forEach(n => {
        if (!knownNotificationIds.current.has(n.id)) {
          knownNotificationIds.current.add(n.id);
          
          // It's a new notification! Show Toast in app
          showToast(n.title, 'info');

          // If we have OS permission, show system notification
          if (Notification.permission === 'granted' && !document.hasFocus()) {
            new Notification(n.title, {
              body: n.subtitle,
              icon: n.posterUrl || 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg',
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, showToast]);

  return null;
}

