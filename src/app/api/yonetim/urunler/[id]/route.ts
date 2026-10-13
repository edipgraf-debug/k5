import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { farklar, idParam, yonetici } from '@/lib/yonetim-api';

const Sema = z.object({
  aktif: z.boolean(),
  webFiyati: z.number().nonnegative('Fiyat negatif olamaz').max(1_000_000).nullable(),
  aciklama: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(2000).nullable()),
});

/** Sitede düzenlenen ürün alanları: satışta mı, web fiyatı, açıklama. Opak alanları (ad, barkod, liste fiyatı) senkronla gelir. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  const once = id ? await t.urunKaydi(id) : null;
  if (!id || !once) return hata('Ürün bulunamadı', 404);
  const webFiyati = g.veri.webFiyati == null ? null : Math.round(g.veri.webFiyati * 100) / 100;
  await t.urunGuncelle(id, { ...g.veri, webFiyati });
  const f = farklar(once as unknown as Record<string, unknown>, { ...g.veri, webFiyati }, { aktif: 'satış durumu', webFiyati: 'web fiyatı', aciklama: 'açıklama' });
  if (f) await (await yonetimRepo()).islemYaz(o.sub, 'Urun', id, 'Ürün güncellendi', `${once.ad} · ${f}`);
  return NextResponse.json({ urun: await t.urunKaydi(id) });
}
