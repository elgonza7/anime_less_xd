import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  increment,
  orderBy,
  query,
  limit,
  setDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";

const SCORES_COLLECTION = "scores";

export async function submitScore(user, pointsWonThisRun) {
  if (!firebaseReady || !user) return;

  const ref = doc(db, SCORES_COLLECTION, user.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await setDoc(
      ref,
      {
        displayName: user.displayName,
        photoURL: user.photoURL,
        totalPoints: increment(pointsWonThisRun),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } else {
    await setDoc(ref, {
      displayName: user.displayName,
      photoURL: user.photoURL,
      totalPoints: pointsWonThisRun,
      updatedAt: Date.now(),
    });
  }
}

export async function getTopScores(topN = 10) {
  if (!firebaseReady) return [];
  const q = query(collection(db, SCORES_COLLECTION), orderBy("totalPoints", "desc"), limit(topN));
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }));
}

// firestore no tiene "rank" nativo asi que contamos cuanta gente le gana.
// para un leaderboard chico esto sale gratis, si esto se vuelve el nuevo facebook
// habra que migrar a un contador desnormalizado
export async function getUserRank(uid) {
  if (!firebaseReady) return null;

  const userSnap = await getDoc(doc(db, SCORES_COLLECTION, uid));
  if (!userSnap.exists()) return null;

  const myScore = userSnap.data().totalPoints ?? 0;
  const aheadQuery = query(collection(db, SCORES_COLLECTION), where("totalPoints", ">", myScore));
  const aheadCount = await getCountFromServer(aheadQuery);

  return {
    uid,
    rank: aheadCount.data().count + 1,
    totalPoints: myScore,
    displayName: userSnap.data().displayName,
    photoURL: userSnap.data().photoURL,
  };
}
