import type { PersonelTipi } from '@/lib/data/yonetim';

export const TIP_ADI: Record<PersonelTipi, string> = { Ogretmen: 'Öğretmen', Okul: 'Okul yetkilisi', Yonetim: 'Kitabevi', Plasiyer: 'Plasiyer' };
/** Panelde telefon tam görünür (kayıt düzeltmek için gerekli); biçimli: 0532 000 00 00 */
export const telGoster = (t: string) => `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}`;
