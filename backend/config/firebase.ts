import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = getApps().length === 0
  ? initializeApp({
      projectId: firebaseConfig.projectId,
    })
  : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);


