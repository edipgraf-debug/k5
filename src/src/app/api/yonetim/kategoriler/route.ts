import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { KategoriSema } from '@/lib/kategori-api';

export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, KategoriSema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  if (g.veri.ustId && !(await t.kategoriler()).some((k) => k.id === g.veri.ustId)) return hata('Üst kategori bulunamadı');
  const id = await kayitIslemi(() => t.kategoriKaydet(null, g.veri));
  if (id instanceof Response) return id;
  await (await yonetimRepo()).islemYaz(o.sub, 'Kategori', id, 'Kategori eklendi', g.veri.ad);
  return NextResponse.json({ id });
}
