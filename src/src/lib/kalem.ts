import 'server-only';
import { repo } from './data/repo';
import { ticaretRepo, type SetKaydi, type UrunKaydi } from './data/ticaret';
import type { Kalem, ListeSatiri, Urun } from './types';

export { satirAnahtari, satirFiyati, zorunluToplam } from './kalem-ortak';

export const urunKalemi = (u: Urun): Kalem => ({
  anahtar: `u${u.id}`, tur: 'urun', id: u.id, ad: u.ad, alt: [u.yayinevi, u.yazar].filter(Boolean).join(' · '), barkod: u.barkod, fiyat: u.fiyat,
  stok: u.stok ?? null, kapak: !!u.kapak,
});

export const urunKaydiKalemi = (u: UrunKaydi): Kalem => urunKalemi({ ...u, kapak: !!u.kapakDosya });

export const setKalemi = (s: SetKaydi): Kalem => ({
  anahtar: `s${s.id}`, tur: 'set', id: s.id, ad: s.ad, alt: `${s.satirlar.reduce((a, x) => a + x.adet, 0)} ürünlük set`, barkod: s.barkod,
  fiyat: s.satisFiyati, icerik: s.satirlar.map((x) => ({ ad: x.ad, adet: x.adet })),
  // set stoku: içindeki ürünlerden kaç set çıkar (bilinmeyen stok varsa bilinmiyor)
  stok: s.satirlar.some((x) => x.stok == null) ? null : Math.min(...s.satirlar.map((x) => Math.floor((x.stok ?? 0) / x.adet))),
});

/** Yayındaki kampanyaların fiyatını ürün kalemlerine uygular (eski fiyat üstü çizili gösterilir). */
export async function kampanyaUygula(kalemler: Kalem[]): Promise<Kalem[]> {
  const urunler = kalemler.filter((k) => k.tur === 'urun');
  if (!urunler.length) return kalemler;
  const fiyat = new Map<number, { fiyat: number; ad: string }>();
  for (const k of await (await ticaretRepo()).kampanyalar({ yayindakiler: true })) {
    for (const u of k.urunler) {
      const v = fiyat.get(u.urunId);
      if (!v || u.kampanyaFiyati < v.fiyat) fiyat.set(u.urunId, { fiyat: u.kampanyaFiyati, ad: k.ad });
    }
  }
  return kalemler.map((k) => {
    const v = k.tur === 'urun' ? fiyat.get(k.id) : undefined;
    return v && v.fiyat < k.fiyat ? { ...k, eskiFiyat: k.fiyat, fiyat: v.fiyat, kampanya: v.ad } : k;
  });
}

/** Sepet satırlarındaki ürün ve setleri tek sözlükte döndürür: { "u12": Kalem, "s3": Kalem } (kampanya fiyatlarıyla) */
export async function kalemleriGetir(satirlar: Pick<ListeSatiri, 'urunId' | 'setId'>[]): Promise<Record<string, Kalem>> {
  const urunIdleri = [...new Set(satirlar.filter((s) => !s.setId && s.urunId).map((s) => s.urunId as number))];
  const setIdleri = [...new Set(satirlar.filter((s) => s.setId).map((s) => s.setId as number))];
  const [urunler, setler] = await Promise.all([
    urunIdleri.length ? (await repo()).urunler(urunIdleri) : Promise.resolve([]),
    setIdleri.length ? (await ticaretRepo()).setler(setIdleri) : Promise.resolve([]),
  ]);
  const l = await kampanyaUygula([...urunler.map(urunKalemi), ...setler.map(setKalemi)]);
  return Object.fromEntries(l.map((k) => [k.anahtar, k]));
}

/** Canlı arama ve katalog araması: setler + satıştaki ürünler */
export async function kalemAra(q: string, limit = 12): Promise<Kalem[]> {
  const [setler, urunler] = await Promise.all([(await ticaretRepo()).setAra(q, 4), (await repo()).urunAra(q, limit)]);
  return kampanyaUygula([...setler.map(setKalemi), ...urunler.map(urunKalemi)]);
}
