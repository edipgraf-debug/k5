import type { Kalem, ListeSatiri } from './types';

/** Satırın kalem anahtarı: ürün "u12", set "s3" (istemci ve sunucu ortak) */
export const satirAnahtari = (s: Pick<ListeSatiri, 'urunId' | 'setId'>) => (s.setId ? `s${s.setId}` : `u${s.urunId}`);

/** Satırın veliye yansıyan birim fiyatı: okula özel satış fiyatı, yoksa kalemin fiyatı */
export const satirFiyati = (s: ListeSatiri, k: Kalem | undefined) => s.satisFiyati ?? k?.fiyat ?? 0;

/** Zorunlu kalemlerin toplamı (adetle) */
export const zorunluToplam = (satirlar: ListeSatiri[], kalemler: Record<string, Kalem>) =>
  Math.round(satirlar.reduce((a, s) => a + (s.zorunlu ? satirFiyati(s, kalemler[satirAnahtari(s)]) * s.adet : 0), 0) * 100) / 100;
