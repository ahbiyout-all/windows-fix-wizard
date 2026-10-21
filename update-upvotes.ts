import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(config);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || "(default)");

async function updateUpvoteCounts() {
  const issuesRef = collection(db, "issues");
  const snapshot = await getDocs(issuesRef);
  
  let updated = 0;
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(document => {
    const data = document.data();
    const upvoteCount = data.upvotedBy ? data.upvotedBy.length : 0;
    if (data.upvoteCount !== upvoteCount) {
      batch.update(doc(db, "issues", document.id), { upvoteCount });
      updated++;
    }
  });
  
  if (updated > 0) {
    await batch.commit();
    console.log(`Updated ${updated} issues with upvoteCount.`);
  } else {
    console.log("No issues needed updating.");
  }
}

updateUpvoteCounts().catch(console.error);
