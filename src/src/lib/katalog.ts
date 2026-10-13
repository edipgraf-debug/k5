import 'server-only';
import { repo } from './data/repo';
import { ticaretRepo, type KategoriKaydi } from './data/ticaret';
import type { Oturum } from './types';

export interface VeliOgrenciSecenegi { id: number; ad: string; sinif: string }

/** Katalog sayfalarında velinin "Sepete ekle" için öğrencileri (diğer rollerde boş) */
export async function veliOgrencileri(o: Oturum): Promise<VeliOgrenciSecenegi[]> {
  if (o.rol !== 'veli') return [];
  return (await (await repo()).veliOgrencileri(o.sub)).map((x) => ({ id: x.id, ad: `${x.ad} ${x.soyad}`, sinif: x.sinifSube }));
}

/** Kategori yolu (kökten seçilene): "Okuma Kitapları › Ortaokul Okuma" */
export function kategoriYolu(l: KategoriKaydi[], id: number | null): KategoriKaydi[] {
  const out: KategoriKaydi[] = [];
  let k = l.find((x) => x.id === id);
  while (k && out.length < 10) { out.unshift(k); k = l.find((x) => x.id === k!.ustId); }
  return out;
}

export async function aktifKategoriler() {
  return (await ticaretRepo()).kategoriler(false);
}
