import 'server-only';
import ExcelJS from 'exceljs';

export type Hucre = string | number | Date | null;

/** Basit rapor Excel'i: lacivert başlık satırı, sabit başlık, metin sütunları */
export async function tabloExcel(sayfa: string, sutunlar: { baslik: string; genislik?: number; metin?: boolean; para?: boolean }[], satirlar: Hucre[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sayfa.slice(0, 31));
  ws.columns = sutunlar.map((s) => ({ header: s.baslik, width: s.genislik ?? 16 }));
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF172334' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  sutunlar.forEach((s, i) => {
    if (s.metin) ws.getColumn(i + 1).numFmt = '@';
    if (s.para) ws.getColumn(i + 1).numFmt = '#,##0.00 "₺"';
  });
  for (const s of satirlar) ws.addRow(s.map((h) => h ?? ''));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sutunlar.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
