import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import axios from "axios";

// Helper to convert base64 VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class MatchAlertService {
  /**
   * Request permission for Web Notifications
   */
  static async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications.");
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  /**
   * Register a user's push subscription for a live match in Firestore
   */
  static async registerAlert(
    userId: string,
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    sportType: string
  ): Promise<boolean> {
    try {
      // 1. Ensure permission is granted
      const granted = await this.requestPermission();
      if (!granted) return false;

      // 2. Fetch VAPID public key from backend
      const response = await axios.get("/api/notifications/vapid-public-key");
      const publicKey = response.data.publicKey;
      if (!publicKey) throw new Error("VAPID public key not found");

      // 3. Register or get Service Worker registration
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker is not supported in this browser");
      }
      
      const registration = await navigator.serviceWorker.ready;
      
      // 4. Get or create Push Subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      // 5. Store alert registration in Firestore
      const alertRef = doc(db, "match_alerts", `${userId}_${matchId}`);
      await setDoc(alertRef, {
        userId,
        matchId,
        homeTeam,
        awayTeam,
        sportType: sportType || "football",
        createdAt: new Date().toISOString(),
        kickoffNotified: false,
        finalNotified: false,
        pushSubscription: subscription.toJSON()
      });

      return true;
    } catch (err) {
      console.error("Failed to register match alert subscription:", err);
      return false;
    }
  }

  /**
   * Remove a user's match alert registration
   */
  static async removeAlert(userId: string, matchId: string): Promise<boolean> {
    try {
      const alertRef = doc(db, "match_alerts", `${userId}_${matchId}`);
      await deleteDoc(alertRef);
      return true;
    } catch (err) {
      console.error("Failed to remove match alert registration:", err);
      return false;
    }
  }

  /**
   * Check if a match alert is currently registered for a user
   */
  static async checkIsAlertRegistered(userId: string, matchId: string): Promise<boolean> {
    try {
      const alertRef = doc(db, "match_alerts", `${userId}_${matchId}`);
      const docSnap = await getDoc(alertRef);
      return docSnap.exists();
    } catch (err) {
      console.warn("Failed to check match alert existence:", err);
      return false;
    }
  }
}
