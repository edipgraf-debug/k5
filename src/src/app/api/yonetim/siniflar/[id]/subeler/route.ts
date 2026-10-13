import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, yonetici } from '@/lib/yonetim-api';

const Sema = z.object({ ad: z.string().trim().min(1, 'Şube adı girin').max(20) });

/** Sınıfa şube ekle (ör. 5-C) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const sinifId = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const okulId = sinifId ? await y.sinifOkulu(sinifId) : null;
  if (!sinifId || !okulId) return hata('Sınıf bulunamadı', 404);
  const ad = g.veri.ad.toLocaleUpperCase('tr');
  const s = await kayitIslemi(() => y.subeEkle(sinifId, ad));
  if (s instanceof Response) return s;
  await y.islemYaz(o.sub, 'Okul', okulId, 'Şube eklendi', ad);
  return NextResponse.json({ siniflar: await y.okulSiniflari(okulId) });
}
