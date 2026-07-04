import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const targets40 = [
  'aline lima',
  'leonardo silva',
  'gabriela altrao pereira',
  'marcos da silva',
  'wiilian mangiolardo',
  'willian mangiolardo',
  'cybelle costa felipe',
  'bianca ribeiro'
];

const targets50 = [
  'gisele coutinho pungan',
  'andre luiz villas boas'
];

async function updateRates() {
  console.log("Buscando analisandos no Firestore...");
  const patientsRef = collection(db, 'patients');
  const snapshot = await getDocs(patientsRef);
  
  let count40 = 0;
  let count50 = 0;
  let matchesFound = new Set<string>();

  for (const docSnap of snapshot.docs) {
    const patientData = docSnap.data();
    const originalName = patientData.name;
    const normalized = normalizeName(originalName);
    
    if (targets40.includes(normalized)) {
      console.log(`Atualizando ${originalName} (de R$ ${patientData.defaultRate} para R$ 40,00)`);
      const patientDocRef = doc(db, 'patients', docSnap.id);
      await updateDoc(patientDocRef, { defaultRate: 40 });
      count40++;
      matchesFound.add(normalized);
    } else if (targets50.includes(normalized)) {
      console.log(`Atualizando ${originalName} (de R$ ${patientData.defaultRate} para R$ 50,00)`);
      const patientDocRef = doc(db, 'patients', docSnap.id);
      await updateDoc(patientDocRef, { defaultRate: 50 });
      count50++;
      matchesFound.add(normalized);
    }
  }

  console.log("\n--- RESULTADO DAS ATUALIZAÇÕES ---");
  console.log(`Pacientes atualizados para R$ 40,00: ${count40}`);
  console.log(`Pacientes atualizados para R$ 50,00: ${count50}`);

  // Verificar se algum paciente alvo não foi encontrado
  console.log("\n--- ALERTA DE PACIENTES NÃO ENCONTRADOS ---");
  const allTargets = [...targets40, ...targets50];
  let notFoundCount = 0;
  for (const target of allTargets) {
    // Evita duplicados em alvos como willian/wiilian
    if (target === 'willian mangiolardo' && matchesFound.has('wiilian mangiolardo')) continue;
    if (target === 'wiilian mangiolardo' && matchesFound.has('willian mangiolardo')) continue;
    
    if (!matchesFound.has(target)) {
      console.warn(`Aviso: Paciente alvo '${target}' não foi encontrado no banco de dados.`);
      notFoundCount++;
    }
  }
  if (notFoundCount === 0) {
    console.log("Todos os pacientes alvos foram localizados e atualizados!");
  }
}

updateRates().catch(err => {
  console.error("Erro durante a atualização dos valores:", err);
  process.exit(1);
});
