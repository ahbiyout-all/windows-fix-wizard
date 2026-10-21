
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";
import "dotenv/config";

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let projectId = undefined;
let databaseId = undefined;
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  projectId = config.projectId;
  databaseId = config.firestoreDatabaseId;
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const db = getAdminFirestore(admin.app(), databaseId);

async function check() {
  console.log("Checking backend_logs...");
  const snap = await db.collection('backend_logs').orderBy('timestamp', 'desc').limit(5).get();
  snap.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

check();
