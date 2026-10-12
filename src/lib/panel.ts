import 'server-only';
import { repo } from './data/repo';
import { listeErisimi } from './listeler';
import type { KitapListesi, OgrenciOzet, Oturum, TakipSatiri, YayinOzeti } from './types';

export interface SepetOzeti {
  liste: KitapListesi;
  kapsamOgrenci: number;
  acik: number;        // sepeti görebilen öğrenci
  acan: number;        // velisi sepeti açan öğrenci
  ulasmayan: number;   // son SMS'i ulaşmayan öğrenci
}

export interface OgrenciSatiri extends OgrenciOzet {
  acikSepet: number;
  acilan: number;
}

export interface SubeOzeti { sinifSube: string; ogrenci: number; velisiz: number; sepetAcik: number; acan: number }

export interface PanelVerisi {
  ogrenciler: OgrenciSatiri[];
  sepetler: SepetOzeti[];
  subeler: SubeOzeti[];
  sonYayinlar: YayinOzeti[];
  toplam: { ogrenci: number; velisiz: number; yayinda: number; taslak: number; ulasmayan: number; sepetiAcik: number; acan: number };
}

/**
 * Öğretmen, okul ve Kardelen ana sayfaları için okul özeti.
 * sadeceSubeler: öğretmen için kendi şubeleri; okul / Kardelen için null (tüm okul).
 */
export async function panelVerisi(o: Oturum, okulId: number, sadeceSubeler: number[] | null): Promise<PanelVerisi> {
  const r = await repo();
  const ogr = await r.okulOgrencileri(okulId, sadeceSubeler);
  const izinli = new Set(ogr.map((x) => x.id));
  const listeler: KitapListesi[] = [];
  for (const l of await r.okulListeleri(okulId)) if (await listeErisimi(o, l)) listeler.push(l);

  const takip = new Map<number, TakipSatiri[]>();
  for (const l of listeler) takip.set(l.id, (await r.listeTakip(l.id)).filter((t) => izinli.has(t.ogrenciId)));

  const sepetler: SepetOzeti[] = listeler.map((l) => {
    const t = takip.get(l.id)!;
    return { liste: l, kapsamOgrenci: t.length, acik: t.filter((x) => x.gorebilir).length, acan: t.filter((x) => x.acildi).length,
      ulasmayan: t.filter((x) => x.sms === 'Hata').length };
  }).sort((a, b) => Number(b.liste.yayinda) - Number(a.liste.yayinda) || a.liste.ad.localeCompare(b.liste.ad, 'tr'));

  const ogrenciler: OgrenciSatiri[] = ogr.map((x) => {
    const satirlar = [...takip.values()].flatMap((t) => t.filter((s) => s.ogrenciId === x.id));
    return { ...x, acikSepet: satirlar.filter((s) => s.gorebilir).length, acilan: satirlar.filter((s) => s.acildi).length };
  });

  const subeMap = new Map<string, SubeOzeti>();
  for (const x of ogrenciler) {
    const s = subeMap.get(x.sinifSube) ?? { sinifSube: x.sinifSube, ogrenci: 0, velisiz: 0, sepetAcik: 0, acan: 0 };
    s.ogrenci++;
    if (!x.veliSayisi) s.velisiz++;
    if (x.acikSepet) s.sepetAcik++;
    if (x.acilan) s.acan++;
    subeMap.set(x.sinifSube, s);
  }

  const sonYayinlar = await r.sonYayinlar(okulId, 6, o.rol === 'ogretmen' ? o.sub : undefined);
  return {
    ogrenciler, sepetler, subeler: [...subeMap.values()], sonYayinlar,
    toplam: {
      ogrenci: ogrenciler.length,
      velisiz: ogrenciler.filter((x) => !x.veliSayisi).length,
      yayinda: listeler.filter((l) => l.yayinda).length,
      taslak: listeler.filter((l) => !l.yayinda).length,
      ulasmayan: sepetler.reduce((a, s) => a + s.ulasmayan, 0),
      sepetiAcik: ogrenciler.filter((x) => x.acikSepet).length,
      acan: ogrenciler.filter((x) => x.acilan).length,
    },
  };
}
