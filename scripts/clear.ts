import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollections() {
  console.log("Iniciando limpeza das coleções no Firestore...");
  const collections = ['patients', 'invoices', 'rent_logs', 'sessions', 'platform_transactions'];

  for (const colName of collections) {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    console.log(`Coleção "${colName}": ${snapshot.size} documentos encontrados.`);

    if (snapshot.empty) continue;

    const BATCH_LIMIT = 450;
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      batch.delete(doc(db, colName, docSnap.id));
      count++;

      if (count >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`Coleção "${colName}": Limpa com sucesso.`);
  }

  console.log("Limpeza concluída!");
}

clearCollections().catch(console.error);
