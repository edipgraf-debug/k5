import 'server-only';
import ExcelJS from 'exceljs';
import { katla } from '../katla';
import type { HamSatir } from './tipler';

export const MAX_SATIR = 5000;
export const MAX_BAYT = 5 * 1024 * 1024;

type Alan = Exclude<keyof HamSatir, 'satirNo'> | 'adSoyad' | 'sinifSube';

/** Başlık eşleşmesi: harf dışı karakterler ve Türkçe harf farkı yok sayılır */
const ESANLAMLI: Record<Alan, string[]> = {
  okulKodu: ['okulkodu', 'kurumkodu', 'okulkod'],
  okulNo: ['okulno', 'ogrencino', 'no', 'numara', 'ogrencinumarasi', 'okulnumarasi', 'okulnosu', 'ogrencinumara'],
  ad: ['ad', 'adi', 'ogrenciadi', 'ogrenciad', 'isim'],
  soyad: ['soyad', 'soyadi', 'ogrencisoyadi', 'ogrencisoyad'],
  adSoyad: ['adsoyad', 'adisoyadi', 'ogrenciadsoyad', 'ogrenciadisoyadi', 'ogrenci', 'adsoyadi', 'ogrenciadsoyadi'],
  sinif: ['sinif', 'seviye', 'sinifi', 'sinifseviyesi'],
  sube: ['sube', 'subesi', 'subeadi'],
  sinifSube: ['sinifsube', 'sinifsubesi', 'sinifisubesi', 'sinifvesube'],
  veliAdSoyad: ['veliadsoyad', 'veliadi', 'veliadisoyadi', 'veli', 'veliadsoyadi', 'velisi'],
  veliTelefon: ['velitelefon', 'velitel', 'velicep', 'veliceptelefonu', 'velitelefonu', 'veligsm', 'telefon', 'ceptelefonu', 'gsm', 'tel', 'veli1telefon', '1velitelefon', 'annetelefon', 'annetelefonu'],
  veliTelefon2: ['veli2telefon', '2velitelefon', 'velitelefon2', 'ikincivelitelefon', 'veli2tel', 'babatelefon', 'babatelefonu', 'telefon2'],
  veliEposta: ['velieposta', 'eposta', 'email', 'velimail', 'mail', 'veliemail', 'epostaadresi'],
};
const SOZLUK = new Map<string, Alan>();
for (const [alan, l] of Object.entries(ESANLAMLI) as [Alan, string[]][]) for (const k of l) SOZLUK.set(k, alan);
const anahtar = (s: string) => katla(s).replace(/[^a-z0-9]/g, '');

export class DosyaHatasi extends Error {}

/** Hücre değerini metne çevirir (sayı olarak girilmiş telefon / okul no dahil) */
function hucreMetni(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'string') return v.trim() || null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join('').trim() || null;
    if (o.text != null) return hucreMetni(o.text);
    if (o.result != null) return hucreMetni(o.result);
  }
  return String(v).trim() || null;
}

async function xlsxOku(icerik: Buffer): Promise<(string | null)[][]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(icerik as unknown as ArrayBuffer);
  } catch {
    throw new DosyaHatasi('Dosya okunamadı. Excel (.xlsx) ya da CSV dosyası yükleyin.');
  }
  // öğrenci listesi olan ilk sayfa (boş sayfaları ve "Açıklama" sayfasını atla)
  const ws = wb.worksheets.find((w) => w.actualRowCount > 0 && !/a[cç][iı]klama/i.test(w.name));
  if (!ws) throw new DosyaHatasi('Dosyada dolu bir sayfa yok');
  if (ws.actualRowCount > MAX_SATIR + 20) throw new DosyaHatasi(`Bir dosyada en fazla ${MAX_SATIR} öğrenci olabilir`);
  const satirlar: (string | null)[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const vals = (row.values as unknown[]).slice(1).map(hucreMetni);
    satirlar[n - 1] = vals;
  });
  return Array.from(satirlar, (r) => r ?? []);
}

function csvOku(icerik: Buffer): (string | null)[][] {
  let metin: string;
  try {
    metin = new TextDecoder('utf-8', { fatal: true }).decode(icerik);
  } catch {
    metin = new TextDecoder('windows-1254').decode(icerik);   // Excel'in Türkçe CSV'si
  }
  metin = metin.replace(/^﻿/, '');
  const ilk = metin.split(/\r?\n/, 1)[0] ?? '';
  const ayrac = [';', '\t', ','].sort((a, b) => ilk.split(b).length - ilk.split(a).length)[0];
  const out: (string | null)[][] = [];
  let satir: (string | null)[] = [], alan = '', tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++; }
      else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ayrac) { satir.push(alan.trim() || null); alan = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++;
      satir.push(alan.trim() || null); out.push(satir); satir = []; alan = '';
      if (out.length > MAX_SATIR + 20) throw new DosyaHatasi(`Bir dosyada en fazla ${MAX_SATIR} öğrenci olabilir`);
    } else alan += c;
  }
  if (alan || satir.length) { satir.push(alan.trim() || null); out.push(satir); }
  return out;
}

export interface OkumaSonucu { satirlar: HamSatir[]; kolonlar: string[]; taninmayan: string[] }

/**
 * Excel (.xlsx) ya da CSV dosyasını okur. Başlık satırını ilk 15 satırda arar
 * (e-Okul çıktılarındaki üst başlıklar atlanır); kolon adları farklı yazımlarla tanınır.
 */
export async function dosyaOku(icerik: Buffer, dosyaAdi: string): Promise<OkumaSonucu> {
  if (icerik.length > MAX_BAYT) throw new DosyaHatasi('Dosya en fazla 5 MB olabilir');
  const uz = dosyaAdi.toLowerCase().split('.').pop();
  if (uz === 'xls') throw new DosyaHatasi('Eski Excel biçimi (.xls) desteklenmiyor. Dosyayı Excel\'de "Farklı Kaydet → Excel Çalışma Kitabı (.xlsx)" ile kaydedip yükleyin.');
  const zip = icerik.length > 4 && icerik[0] === 0x50 && icerik[1] === 0x4b;
  let tablo: (string | null)[][];
  if (uz === 'xlsx' || zip) tablo = await xlsxOku(icerik);
  else if (uz === 'csv' || uz === 'txt') tablo = csvOku(icerik);
  else throw new DosyaHatasi('Excel (.xlsx) ya da CSV dosyası yükleyin');

  // başlık satırı: en çok alanı tanınan satır (en az 3 alan)
  let baslikIdx = -1, enIyi = 0;
  for (let i = 0; i < Math.min(15, tablo.length); i++) {
    const n = new Set((tablo[i] ?? []).map((h) => (h ? SOZLUK.get(anahtar(h)) : undefined)).filter(Boolean)).size;
    if (n > enIyi) { enIyi = n; baslikIdx = i; }
  }
  if (baslikIdx < 0 || enIyi < 3) {
    throw new DosyaHatasi('Başlık satırı bulunamadı. İlk satırda "Okul No, Ad, Soyad, Sınıf, Şube, Veli Telefon" gibi kolon adları olmalı (şablonu indirebilirsiniz).');
  }
  const kolon = new Map<Alan, number>();
  const taninmayan: string[] = [];
  (tablo[baslikIdx] ?? []).forEach((h, i) => {
    if (!h) return;
    const a = SOZLUK.get(anahtar(h));
    if (a && !kolon.has(a)) kolon.set(a, i);
    else if (!a) taninmayan.push(h);
  });
  const adVar = kolon.has('ad') && kolon.has('soyad');
  if (!adVar && !kolon.has('adSoyad')) throw new DosyaHatasi('"Ad" ve "Soyad" (ya da "Ad Soyad") kolonu bulunamadı');
  if (!kolon.has('okulNo')) throw new DosyaHatasi('"Okul No" kolonu bulunamadı');
  if (!kolon.has('sinif') && !kolon.has('sinifSube')) throw new DosyaHatasi('"Sınıf" (ya da "Sınıf/Şube") kolonu bulunamadı');

  const al = (r: (string | null)[], a: Alan) => (kolon.has(a) ? r[kolon.get(a)!] ?? null : null);
  const satirlar: HamSatir[] = [];
  for (let i = baslikIdx + 1; i < tablo.length; i++) {
    const r = tablo[i] ?? [];
    if (!r.some((v) => v)) continue;                        // boş satır
    let ad = al(r, 'ad'), soyad = al(r, 'soyad');
    if (!adVar) {
      const tam = (al(r, 'adSoyad') ?? '').replace(/\s+/g, ' ').trim();
      const p = tam.split(' ');
      soyad = p.length > 1 ? p.pop()! : null;
      ad = p.join(' ') || null;
    }
    satirlar.push({
      satirNo: i + 1, okulKodu: al(r, 'okulKodu'), okulNo: al(r, 'okulNo'), ad, soyad,
      sinif: al(r, 'sinif') ?? al(r, 'sinifSube'), sube: kolon.has('sube') ? al(r, 'sube') : null,
      veliAdSoyad: al(r, 'veliAdSoyad'), veliTelefon: al(r, 'veliTelefon'), veliTelefon2: al(r, 'veliTelefon2'), veliEposta: al(r, 'veliEposta'),
    });
  }
  if (!satirlar.length) throw new DosyaHatasi('Dosyada öğrenci satırı yok');
  if (satirlar.length > MAX_SATIR) throw new DosyaHatasi(`Bir dosyada en fazla ${MAX_SATIR} öğrenci olabilir`);
  return { satirlar, kolonlar: [...kolon.keys()], taninmayan };
}
