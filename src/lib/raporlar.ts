import 'server-only';
import { repo } from './data/repo';
import { yonetimRepo } from './data/yonetim';
import { ticaretRepo, type OdemeDurumu, type OdemeTipi, type TahsilatFiltresi } from './data/ticaret';
import { gunBasi, gunSonu, sepetDurumu } from './bicim';
import type { Oturum } from './types';
import { plasiyerOkulIdleri } from './plasiyer';

/** Rapor kapsamı: kitabevi tüm okullar (null); plasiyer yalnız kendi okulları */
export async function raporKapsami(o: Oturum): Promise<number[] | null | false> {
  if (o.rol === 'yonetim') return null;
  if (o.rol === 'plasiyer') return plasiyerOkulIdleri(o.sub);
  return false;
}

export type TahsilatSP = { bas?: string; bit?: string; tip?: string; durum?: string; okulId?: string; q?: string };
export function tahsilatFiltresi(sp: TahsilatSP, okulIdleri: number[] | null): TahsilatFiltresi {
  return {
    baslangic: gunBasi(sp.bas), bitis: gunSonu(sp.bit),
    tip: (['Kart', 'Havale'] as OdemeTipi[]).find((x) => x === sp.tip) ?? null,
    durum: (['Bekliyor', 'Basarili', 'Basarisiz', 'Iade'] as OdemeDurumu[]).find((x) => x === sp.durum) ?? null,
    okulId: Number(sp.okulId) || null, okulIdleri, q: (sp.q ?? '').slice(0, 100),
  };
}

export interface TavsiyeDurumSatiri {
  listeId: number; okulId: number; okulAd: string; plasiyerAd: string | null; ad: string; kapsamAd: string; durum: 'taslak' | 'yayinda' | 'degisti';
  hazirlayan: string; hazirlayanTip: string; kapsam: number; acik: number; acan: number; siparis: number; yayinTarihi: Date | null;
}

/** Tavsiye sepeti durumu: okul / sınıf / plasiyer bazında sepet açık, veli açtı, sipariş veren ve dönüşüm */
export async function tavsiyeDurumu(okulIdleri: number[] | null, filtre: { okulId?: number | null; yalnizYayinda?: boolean } = {}): Promise<TavsiyeDurumSatiri[]> {
  const [r, y, t] = await Promise.all([repo(), yonetimRepo(), ticaretRepo()]);
  const okullar = (await y.okulListesi()).filter((x) => (!okulIdleri || okulIdleri.includes(x.id)) && (!filtre.okulId || x.id === filtre.okulId));
  const siparisli = await t.siparisVerenOgrenciler(okullar.map((x) => x.id));
  const kisiler = new Map<number, { ad: string; tip: string }>();
  const kisi = async (id: number) => {
    if (!kisiler.has(id)) { const p = await y.personelKaydi(id); kisiler.set(id, { ad: p?.adSoyad ?? '-', tip: p?.tip ?? '' }); }
    return kisiler.get(id)!;
  };
  const out: TavsiyeDurumSatiri[] = [];
  for (const ok of okullar) {
    for (const l of await r.okulListeleri(ok.id)) {
      if (filtre.yalnizYayinda && !l.yayinda) continue;
      const takip = await r.listeTakip(l.id);
      const h = await kisi(l.olusturanId);
      out.push({ listeId: l.id, okulId: ok.id, okulAd: ok.ad, plasiyerAd: ok.plasiyerAd, ad: l.ad, kapsamAd: l.kapsamAd, durum: sepetDurumu(l),
        hazirlayan: h.ad, hazirlayanTip: h.tip, kapsam: takip.length, acik: takip.filter((x) => x.gorebilir).length, acan: takip.filter((x) => x.acildi).length,
        siparis: takip.filter((x) => siparisli.has(x.ogrenciId)).length, yayinTarihi: l.yayinTarihi });
    }
  }
  return out.sort((a, b) => a.okulAd.localeCompare(b.okulAd, 'tr') || a.kapsamAd.localeCompare(b.kapsamAd, 'tr', { numeric: true }));
}

export const ODEME_DURUM_ADI: Record<OdemeDurumu, string> = { Bekliyor: 'Bekliyor', Basarili: 'Başarılı', Basarisiz: 'Başarısız', Iade: 'İade' };
export const HAZIRLAYAN_ADI: Record<string, string> = { Ogretmen: 'Öğretmen', Okul: 'Okul yönetimi', Yonetim: 'Kitabevi', Plasiyer: 'Plasiyer' };
