import 'server-only';
import { repo } from './data/repo';
import type { OkulTabloSatiri } from '@/components/panel/OkulTablosu';

export async function okulTablosu(): Promise<OkulTabloSatiri[]> {
  const r = await repo();
  const out: OkulTabloSatiri[] = [];
  for (const o of await r.okullar()) {
    const [ogr, listeler] = await Promise.all([r.okulOgrencileri(o.id, null), r.okulListeleri(o.id)]);
    out.push({ ...o, ogrenci: ogr.length, yayinda: listeler.filter((l) => l.yayinda).length });
  }
  return out;
}
