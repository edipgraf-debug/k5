import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';

const Sema = z.object({ ekle: z.array(z.number().int().positive()).max(1000).default([]), cikar: z.array(z.number().int().positive()).max(1000).default([]) });

/** Kategoriye toplu ürün ekle / çıkar (hızlı arama sonuçlarından seçilenler) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  const k = (await t.kategoriler()).find((x) => x.id === id);
  if (!id || !k) return hata('Kategori bulunamadı', 404);
  const eklenen = g.veri.ekle.length ? await t.kategoriyeEkle(id, g.veri.ekle) : 0;
  if (g.veri.cikar.length) await t.kategoridenCikar(id, g.veri.cikar);
  const y = await yonetimRepo();
  if (eklenen) await y.islemYaz(o.sub, 'Kategori', id, 'Kategoriye ürün eklendi', `${k.ad} · ${eklenen} ürün`);
  if (g.veri.cikar.length) await y.islemYaz(o.sub, 'Kategori', id, 'Kategoriden ürün çıkarıldı', `${k.ad} · ${g.veri.cikar.length} ürün`);
  return NextResponse.json({ eklenen, cikarilan: g.veri.cikar.length });
}
