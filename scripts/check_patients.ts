import * as XLSX_RAW from 'xlsx';
const XLSX = (XLSX_RAW as any).default || XLSX_RAW;
import * as path from 'path';

const excelPath = path.resolve('Analisandos 2026.xlsx');
const workbook = XLSX.readFile(excelPath, { cellDates: true });

function cleanPatientName(name: string): string {
  return name.trim().replace(/^[0-9]+\.\s*/, '');
}

const patientNames = new Set<string>();

// 1. Coleta das faturas
const faturasSheets = [
  { name: ' Faturas (2025)', year: 2025 },
  { name: ' Faturas (2026)', year: 2026 }
];

for (const fSheet of faturasSheets) {
  const sheet = workbook.Sheets[fSheet.name];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  for (const row of rows) {
    if (!row || row.length < 3) continue;
    const colA = row[0];
    if (typeof colA === 'number' && row[2]) {
      const patient = String(row[2]).trim();
      if (patient && patient !== 'None' && patient !== 'Total') {
        patientNames.add(patient);
      }
    }
  }
}

// 2. Coleta das abas
for (const sheetName of workbook.SheetNames) {
  if ([' Faturas (2025)', ' Faturas (2026)', 'Integrando Ser', 'Consultório (2026)'].includes(sheetName)) {
    continue;
  }
  patientNames.add(cleanPatientName(sheetName));
}

const sorted = Array.from(patientNames).sort();
console.log("Unique patient names gathered (" + sorted.length + "):");
console.log(sorted);
