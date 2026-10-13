import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { KampanyaSema } from '@/lib/kampanya';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, KampanyaSema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  if (!id || !(await t.kampanya(id))) return hata('Kampanya bulunamadı', 404);
  for (const u of g.veri.urunler) if (!(await t.urunKaydi(u.urunId))) return hata('Kampanyada bulunmayan bir ürün var');
  const s = await kayitIslemi(() => t.kampanyaKaydet(id, g.veri, o.sub));
  if (s instanceof Response) return s;
  await (await yonetimRepo()).islemYaz(o.sub, 'Kampanya', id, 'Kampanya güncellendi', `${g.veri.ad} · ${g.veri.urunler.length} ürün · ${g.veri.aktif ? 'aktif' : 'pasif'}`);
  return NextResponse.json({ ok: true });
}
