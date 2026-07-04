import * as XLSX_RAW from 'xlsx';
const XLSX = (XLSX_RAW as any).default || XLSX_RAW;
import * as path from 'path';

const excelPath = path.resolve('Analisandos 2026.xlsx');
const workbook = XLSX.readFile(excelPath, { cellDates: true });

function cleanPatientName(name: string): string {
  return name.trim().replace(/^[0-9]+\.\s*/, '');
}

function parseExcelDate(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return null;
}

for (const sheetName of workbook.SheetNames) {
  if ([' Faturas (2025)', ' Faturas (2026)', 'Integrando Ser', 'Consultório (2026)'].includes(sheetName)) {
    continue;
  }

  const sheet = workbook.Sheets[sheetName];
  const patientName = cleanPatientName(sheetName);
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  if (rows.length === 0) {
    continue;
  }

  // Encontra a largura real da planilha
  let maxCols = 0;
  for (const r of rows) {
    if (r && r.length > maxCols) {
      maxCols = r.length;
    }
  }

  let sheetCount = 0;

  for (let colIdx = 0; colIdx < maxCols; colIdx += 3) {
    let emptyCount = 0;
    for (let rIdx = 2; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row || row.length <= colIdx) continue;

      const dateVal = row[colIdx];
      if (dateVal === undefined || dateVal === null) {
        emptyCount++;
        if (emptyCount > 5) break;
        continue;
      }
      emptyCount = 0;
      const dateStr = parseExcelDate(dateVal);
      if (dateStr) {
        sheetCount++;
      }
    }
  }

  console.log(`Sheet "${sheetName}" (Patient: ${patientName}): parsed ${sheetCount} sessions`);
}
