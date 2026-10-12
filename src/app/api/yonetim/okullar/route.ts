import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { kayitIslemi, OkulSema, yonetici } from '@/lib/yonetim-api';

/** Yeni okul */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, OkulSema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const id = await kayitIslemi(() => y.okulEkle(g.veri));
  if (id instanceof Response) return id;
  await y.islemYaz(o.sub, 'Okul', id, 'Okul eklendi', `${g.veri.kod} · ${g.veri.ad}`);
  return NextResponse.json({ id });
}
