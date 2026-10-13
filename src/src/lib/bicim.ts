import type { KitapListesi } from './types';

/** İstemci ve sunucuda ortak biçimlendirme yardımcıları. */
export const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
export const tarihSaat = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' }) : '—';
export const telMaske = (t: string) => `0${t.slice(0, 3)} *** ** ${t.slice(8)}`;
export const epostaMaske = (e: string) => {
  const [a, b] = e.split('@');
  return `${a.slice(0, 2)}***@${b ?? ''}`;
};


export type SepetDurumKodu = 'taslak' | 'yayinda' | 'degisti';
export function sepetDurumu(l: Pick<KitapListesi, 'yayinda' | 'guncelleme' | 'yayinTarihi'>): SepetDurumKodu {
  if (!l.yayinda) return 'taslak';
  const degisti = l.guncelleme && l.yayinTarihi && new Date(l.guncelleme).getTime() - new Date(l.yayinTarihi).getTime() > 1000;
  return degisti ? 'degisti' : 'yayinda';
}

export function hedefMetni(l: Pick<KitapListesi, 'yayinda' | 'hedefTipi' | 'hedefOgrenciler'>) {
  if (!l.yayinda) return 'Henüz kimseye açık değil';
  return l.hedefTipi === 'Toplu' ? 'Tüm sınıfa açık' : `${l.hedefOgrenciler.length} seçili öğrenciye açık`;
}

/** "2026-10-13" → "13.10.2026" */
export const tarihMetni = (s: string | null | undefined) => (s ? s.slice(0, 10).split('-').reverse().join('.') : '—');
/** Tarih aralığı filtresi: "YYYY-MM-DD" → gün başı / gün sonu (Türkiye saati) */
export const gunBasi = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+03:00`) : null);
export const gunSonu = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59+03:00`) : null);
