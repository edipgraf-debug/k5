import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { sinifAdi, yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, yonetici } from '@/lib/yonetim-api';

/** Okulun bu sezonki sınıf ve şubeleri (öğrenci / öğretmen formlarındaki şube seçimi için) */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  if (!id) return hata('Okul bulunamadı', 404);
  return NextResponse.json({ siniflar: await (await yonetimRepo()).okulSiniflari(id) });
}

const Sema = z.object({ seviye: z.number().int().min(0, 'Seviye 0 (anasınıfı) ile 12 arasında olmalı').max(12, 'Seviye 0 (anasınıfı) ile 12 arasında olmalı'), subeler: z.array(z.string().trim().min(1).max(20)).max(20).default(['A']) });

/** Sınıf seviyesi ekle (ör. 6. sınıf) ve isteğe bağlı şubeleri aç */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const okulId = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  if (!okulId || !(await y.okulKaydi(okulId))) return hata('Okul bulunamadı', 404);
  const sinifId = await kayitIslemi(() => y.sinifEkle(okulId, g.veri.seviye));
  if (sinifId instanceof Response) return sinifId;
  for (const ad of [...new Set(g.veri.subeler.map((s) => s.toLocaleUpperCase('tr')))]) await y.subeEkle(sinifId, ad);
  await y.islemYaz(o.sub, 'Okul', okulId, 'Sınıf eklendi', `${sinifAdi(g.veri.seviye)} · şubeler: ${g.veri.subeler.join(', ') || '—'}`);
  return NextResponse.json({ siniflar: await y.okulSiniflari(okulId) });
}
