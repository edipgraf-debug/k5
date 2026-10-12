import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { farklar, idParam, kayitIslemi, VeliSema, yonetici } from '@/lib/yonetim-api';

const Sema = VeliSema.omit({ yakinlik: true }).extend({ aktif: z.boolean().default(true) });
const ADLAR = { telefon: 'telefon', adSoyad: 'ad soyad', eposta: 'e-posta', aktif: 'durum' };

/** Veli bilgileri. Telefon değişirse veli yeni numarayla ve mevcut şifresiyle girer. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const once = id ? await y.veliKaydi(id) : null;
  if (!id || !once) return hata('Veli bulunamadı', 404);
  const s = await kayitIslemi(() => y.veliDuzenle(id, g.veri));
  if (s instanceof Response) return s;
  const f = farklar(once as unknown as Record<string, unknown>, g.veri, ADLAR);
  if (f) await y.islemYaz(o.sub, 'Veli', id, 'Veli bilgileri güncellendi', f);
  return NextResponse.json({ veli: await y.veliKaydi(id) });
}
