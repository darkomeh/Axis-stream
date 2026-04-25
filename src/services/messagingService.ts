import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "../lib/firebase";

export const requestNotificationPermission = async () => {
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BLFJUvqUVbI4Q0Gw9_CIBWQtNCnwuEDg3Ar79Iq6t89Q8F8j-axDZKy-AS67GO3gIdV2oAKsjNsnSsXD_itNWew'
      });
      console.log('FCM Token:', token);
      // Here you would save the token to the user's Firestore document
      return token;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
  }
};

export const onMessageListener = () => {
  try {
    const messaging = getMessaging(app);
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        resolve(payload);
      });
    });
  } catch (error) {
    console.error('Error in onMessageListener', error);
  }
};
