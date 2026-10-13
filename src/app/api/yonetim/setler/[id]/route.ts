import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { SetSema, setUrunKontrol } from '@/lib/set-api';

/** Seti güncelle (yayındaki tavsiye sepetlerinde yeni içerik ve fiyat geçerli olur) */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, SetSema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  const once = id ? await t.setKaydi(id) : null;
  if (!id || !once) return hata('Set bulunamadı', 404);
  const yeniUrunler = g.veri.satirlar.filter((s) => !once.satirlar.some((x) => x.urunId === s.urunId)).map((s) => s.urunId);
  const k = await setUrunKontrol(yeniUrunler);
  if (k) return hata(k);
  const s = await kayitIslemi(() => t.setGuncelle(id, g.veri));
  if (s instanceof Response) return s;
  const degisen = [
    once.ad !== g.veri.ad && 'ad', once.barkod !== g.veri.barkod && 'barkod', once.fiyat !== g.veri.fiyat && 'fiyat', once.aktif !== g.veri.aktif && 'durum',
    once.aciklama !== g.veri.aciklama && 'açıklama',
    JSON.stringify(once.satirlar.map((x) => [x.urunId, x.adet])) !== JSON.stringify(g.veri.satirlar.map((x) => [x.urunId, x.adet])) && 'içerik',
  ].filter(Boolean);
  if (degisen.length) await (await yonetimRepo()).islemYaz(o.sub, 'Set', id, 'Set güncellendi', `${g.veri.ad} · Değişen: ${degisen.join(', ')}`);
  return NextResponse.json({ set: await t.setKaydi(id) });
}
