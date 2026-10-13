import 'server-only';
import ExcelJS from 'exceljs';
import type { YuklemeParti } from './tipler';

const BASLIKLAR = ['Okul Kodu', 'Okul No', 'Ad', 'Soyad', 'Sınıf', 'Şube', 'Veli Ad Soyad', 'Veli Telefon', 'Veli 2 Telefon', 'Veli E-posta'];
const GENISLIK = [12, 10, 18, 18, 8, 8, 22, 16, 16, 28];
const LACIVERT = 'FF172334';
const TURUNCU = 'FFF89C0E';

function baslikSatiri(ws: ExcelJS.Worksheet, basliklar: string[], genislik: number[]) {
  ws.columns = basliklar.map((h, i) => ({ header: h, width: genislik[i] ?? 16 }));
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LACIVERT } };
  r.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  // telefon ve okul no metin olsun (Excel baştaki 0'ı silmesin)
  for (const k of ['B', 'H', 'I']) ws.getColumn(k).numFmt = '@';
}

/** Boş şablon: tek okul için "Okul Kodu" boş bırakılır (okul yükleme ekranında seçilir) */
export async function sablonExcel(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kardelen Okul';
  const ws = wb.addWorksheet('Öğrenciler');
  baslikSatiri(ws, BASLIKLAR, GENISLIK);
  ws.addRow(['', '412', 'Elif', 'Yılmaz', '5', 'A', 'Ayşe Yılmaz', '0532 000 00 00', '', 'ayse@ornek.com']);
  ws.addRow(['', '187', 'Can', 'Yılmaz', '2', 'B', 'Ayşe Yılmaz', '0532 000 00 00', '', 'ayse@ornek.com']);
  ws.addRow(['', '415', 'Mert', 'Kaya', '5-A', '', 'Hakan Kaya', '0533 111 22 33', '0533 111 22 34', '']);
  for (let i = 2; i <= 4; i++) ws.getRow(i).font = { italic: true, color: { argb: 'FF5A6575' } };

  const a = wb.addWorksheet('Açıklama');
  a.getColumn(1).width = 22; a.getColumn(2).width = 90;
  const satirlar: [string, string][] = [
    ['Kolon', 'Açıklama'],
    ['Okul Kodu', 'İsteğe bağlı. Tek okul yüklüyorsanız boş bırakın ve okulu yükleme ekranında seçin. Birden çok okul için her satıra okul kodunu (ör. OK-1001) yazın.'],
    ['Okul No', 'Zorunlu. Aynı okulda aynı numara varsa öğrenci güncellenir (yeni kayıt açılmaz).'],
    ['Ad, Soyad', 'Zorunlu. Tek kolonda "Ad Soyad" da olabilir; son kelime soyad sayılır. TAMAMI BÜYÜK yazılmışsa düzeltilir.'],
    ['Sınıf, Şube', 'Zorunlu. "5" ve "A" ya da tek kolonda "5-A", "5/A", "5. Sınıf / A Şubesi". Anasınıfı için "Anasınıfı". Eksik şubeler istenirse otomatik açılır.'],
    ['Veli Telefon', 'Velinin giriş numarası (cep). Aynı numara birden çok öğrencide varsa kardeş olarak tek hesapta toplanır. Boşsa veli giriş yapamaz.'],
    ['Veli 2 Telefon', 'İsteğe bağlı ikinci veli (ör. baba).'],
    ['Veli E-posta', 'İsteğe bağlı. Tavsiye sepeti bildirimleri e-postayla da gider.'],
    ['', ''],
    ['Not', 'Örnek satırları silip kendi listenizi yazın ya da e-Okul listesini yapıştırın. Kolon sırası önemli değildir; başlık adları tanınır.'],
  ];
  for (const r of satirlar) a.addRow(r);
  a.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  a.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LACIVERT } };
  a.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  a.getColumn(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Hatalı satırlar: düzeltip aynı ekrandan yeniden yüklenebilecek biçimde, "Hata" kolonu en sonda */
export async function hataliSatirlarExcel(p: YuklemeParti): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hatalı satırlar');
  baslikSatiri(ws, [...BASLIKLAR, 'Dosyadaki satır', 'Hata'], [...GENISLIK, 10, 60]);
  ws.getCell('L1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TURUNCU } };
  ws.getCell('L1').font = { bold: true, color: { argb: LACIVERT } };
  for (const s of p.satirlar.filter((x) => x.hata)) {
    ws.addRow([s.okulKodu ?? '', s.okulNo ?? '', s.ad ?? '', s.soyad ?? '', s.sinif ?? '', s.sube ?? '', s.veliAdSoyad ?? '', s.veliTelefon ?? '',
      s.veliTelefon2 ?? '', s.veliEposta ?? '', s.satirNo, s.hata]);
  }
  ws.getColumn('L').alignment = { wrapText: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
