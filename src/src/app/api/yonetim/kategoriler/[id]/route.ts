import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { KategoriSema } from '@/lib/kategori-api';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, KategoriSema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  const l = await t.kategoriler();
  if (!id || !l.some((k) => k.id === id)) return hata('Kategori bulunamadı', 404);
  if (g.veri.ustId === id) return hata('Kategori kendi altına taşınamaz');
  if (g.veri.ustId && !l.some((k) => k.id === g.veri.ustId)) return hata('Üst kategori bulunamadı');
  const s = await kayitIslemi(() => t.kategoriKaydet(id, g.veri));
  if (s instanceof Response) return s;
  await (await yonetimRepo()).islemYaz(o.sub, 'Kategori', id, 'Kategori güncellendi', g.veri.ad);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const t = await ticaretRepo();
  const k = (await t.kategoriler()).find((x) => x.id === id);
  if (!id || !k) return hata('Kategori bulunamadı', 404);
  const s = await kayitIslemi(() => t.kategoriSil(id));
  if (s instanceof Response) return s;
  await (await yonetimRepo()).islemYaz(o.sub, 'Kategori', id, 'Kategori silindi', k.ad);
  return NextResponse.json({ ok: true });
}
