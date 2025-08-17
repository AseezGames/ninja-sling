import { db } from "./firebase";
import { collection, addDoc, query, orderBy, limit, getDocs, where, updateDoc, doc } from "firebase/firestore";

const LEADERBOARD_COLLECTION = "leaderboard";

// Generate unique player ID
export function generatePlayerId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Submit score with UID-based system
export async function submitScore(playerName, playerId, score) {
  try {
    // Check if player already exists by UID
    const q = query(collection(db, LEADERBOARD_COLLECTION), where("playerId", "==", playerId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Player exists - update only if new score is higher
      const playerDoc = snapshot.docs[0];
      const currentScore = playerDoc.data().score || 0;
      
      if (score > currentScore) {
        await updateDoc(doc(db, LEADERBOARD_COLLECTION, playerDoc.id), {
          score: score,
          playerName: playerName, // Update name in case they changed it
          lastPlayed: new Date().toISOString(),
          date: new Date().toLocaleDateString()
        });
        return { updated: true, isHighScore: true };
      }
      return { updated: false, isHighScore: false };
    } else {
      // New player - add new entry
      await addDoc(collection(db, LEADERBOARD_COLLECTION), {
        playerName: playerName,
        playerId: playerId,
        score: score,
        date: new Date().toLocaleDateString(),
        lastPlayed: new Date().toISOString()
      });
      return { updated: true, isHighScore: true };
    }
  } catch (error) {
    console.error("Error submitting score:", error);
    throw error;
  }
}

// Fetch leaderboard (top 10 scores)
export async function fetchLeaderboard() {
  try {
    const q = query(collection(db, LEADERBOARD_COLLECTION), orderBy("score", "desc"), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
}

// Get player's current high score
export async function getPlayerHighScore(playerId) {
  try {
    const q = query(collection(db, LEADERBOARD_COLLECTION), where("playerId", "==", playerId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data().score || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching player high score:", error);
    return 0;
  }
}