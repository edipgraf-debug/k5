import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { KampanyaSema } from '@/lib/kampanya';

export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, KampanyaSema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  for (const u of g.veri.urunler) if (!(await t.urunKaydi(u.urunId))) return hata('Kampanyada bulunmayan bir ürün var');
  const id = await kayitIslemi(() => t.kampanyaKaydet(null, g.veri, o.sub));
  if (id instanceof Response) return id;
  await (await yonetimRepo()).islemYaz(o.sub, 'Kampanya', id, 'Kampanya oluşturuldu', `${g.veri.ad} · ${g.veri.urunler.length} ürün`);
  return NextResponse.json({ id });
}
