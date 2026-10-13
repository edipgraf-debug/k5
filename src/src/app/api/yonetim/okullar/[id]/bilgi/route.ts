import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { farklar, idParam, kayitIslemi, OkulSema, plasiyerKontrol, yonetici } from '@/lib/yonetim-api';

const ADLAR = { kod: 'kod', ad: 'ad', il: 'il', ilce: 'ilçe', adres: 'adres', telefon: 'telefon', eposta: 'e-posta',
  opakCariKodu: 'Opak cari', opakWebCariKodu: 'web cari', aktif: 'durum', plasiyerId: 'plasiyer' };

/** Okul bilgilerini güncelle */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, OkulSema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const once = id ? await y.okulKaydi(id) : null;
  if (!id || !once) return hata('Okul bulunamadı', 404);
  const pk = await plasiyerKontrol(g.veri.plasiyerId);
  if (pk) return hata(pk);
  const s = await kayitIslemi(() => y.okulGuncelle(id, g.veri));
  if (s instanceof Response) return s;
  const f = farklar(once as unknown as Record<string, unknown>, g.veri, ADLAR);
  if (f) await y.islemYaz(o.sub, 'Okul', id, g.veri.aktif === once.aktif ? 'Okul bilgileri güncellendi' : g.veri.aktif ? 'Okul aktif edildi' : 'Okul pasif edildi', f);
  return NextResponse.json({ okul: await y.okulKaydi(id) });
}
