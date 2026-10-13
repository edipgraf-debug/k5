import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { SetSema, setUrunKontrol } from '@/lib/set-api';

/** Yeni ürün seti */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, SetSema);
  if ('yanit' in g) return g.yanit;
  const k = await setUrunKontrol(g.veri.satirlar.map((s) => s.urunId));
  if (k) return hata(k);
  const t = await ticaretRepo();
  const id = await kayitIslemi(() => t.setEkle(g.veri, o.sub));
  if (id instanceof Response) return id;
  await (await yonetimRepo()).islemYaz(o.sub, 'Set', id, 'Set oluşturuldu', `${g.veri.ad} · ${g.veri.barkod} · ${g.veri.satirlar.length} ürün`);
  return NextResponse.json({ id });
}
