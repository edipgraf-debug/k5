import 'server-only';
import { repo } from './data/repo';
import type { OkulTabloSatiri } from '@/components/panel/OkulTablosu';

export async function okulTablosu(): Promise<OkulTabloSatiri[]> {
  const r = await repo();
  const { yonetimRepo } = await import('./data/yonetim');
  const plasiyer = new Map((await (await yonetimRepo()).okulListesi()).map((x) => [x.id, x.plasiyerAd]));
  const out: OkulTabloSatiri[] = [];
  for (const o of await r.okullar()) {
    const [ogr, listeler] = await Promise.all([r.okulOgrencileri(o.id, null), r.okulListeleri(o.id)]);
    out.push({ ...o, ogrenci: ogr.length, yayinda: listeler.filter((l) => l.yayinda).length, plasiyerAd: plasiyer.get(o.id) ?? null });
  }
  return out;
}

/** Okul / öğretmen formlarındaki plasiyer seçimi için aktif plasiyerler */
export async function plasiyerSecenekleri() {
  const { yonetimRepo } = await import('./data/yonetim');
  return (await (await yonetimRepo()).plasiyerListesi()).map((p) => ({ id: p.id, adSoyad: p.adSoyad, kod: p.opakPlasiyerKodu }));
}
