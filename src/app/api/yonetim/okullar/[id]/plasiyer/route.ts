import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, plasiyerKontrol, yonetici } from '@/lib/yonetim-api';

const Sema = z.object({ plasiyerId: z.number().int().positive().nullable() });

/** Okulu plasiyere bağla / bağlantıyı kaldır. Öğretmenlere özel atama yoksa onlar da bu plasiyere geçer. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const okul = id ? await y.okulKaydi(id) : null;
  if (!id || !okul) return hata('Okul bulunamadı', 404);
  const pk = await plasiyerKontrol(g.veri.plasiyerId);
  if (pk) return hata(pk);
  if (okul.plasiyerId === g.veri.plasiyerId) return NextResponse.json({ ok: true });
  await y.okulPlasiyerAta(id, g.veri.plasiyerId);
  const yeni = await y.okulKaydi(id);
  await y.islemYaz(o.sub, 'Okul', id, g.veri.plasiyerId ? 'Plasiyer atandı' : 'Plasiyer kaldırıldı',
    `${okul.plasiyerAd ?? 'yok'} → ${yeni?.plasiyerAd ?? 'yok'}`);
  return NextResponse.json({ ok: true, plasiyerAd: yeni?.plasiyerAd ?? null });
}
