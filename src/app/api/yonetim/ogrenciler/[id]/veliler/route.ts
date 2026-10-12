import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, VeliSema, yonetici } from '@/lib/yonetim-api';

const maske = (t: string) => `${t.slice(0, 3)} *** ** ${t.slice(8)}`;

/** Öğrenciye veli bağla. Telefon kayıtlıysa mevcut veli bağlanır (kardeşler tek hesapta). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, VeliSema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const ogr = id ? await y.ogrenciKaydi(id) : null;
  if (!id || !ogr) return hata('Öğrenci bulunamadı', 404);
  const b = await kayitIslemi(() => y.veliBagla(id, g.veri));
  if (b instanceof Response) return b;
  await y.islemYaz(o.sub, 'Ogrenci', id, 'Veli bağlandı', `${maske(g.veri.telefon)}${b.yeni ? ' (yeni veli)' : ' (kayıtlı veli)'}`);
  await y.islemYaz(o.sub, 'Veli', b.veliId, b.yeni ? 'Veli oluşturuldu' : 'Öğrenci bağlandı', `${ogr.ad} ${ogr.soyad} · ${ogr.okulAd}`);
  return NextResponse.json({ ogrenci: await y.ogrenciKaydi(id), yeni: b.yeni });
}

/** Veliyi bu öğrenciden ayır (veli hesabı silinmez; diğer çocuklarına bağlı kalır) */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const veliId = idParam(new URL(req.url).searchParams.get('veliId') ?? '');
  const y = await yonetimRepo();
  const ogr = id ? await y.ogrenciKaydi(id) : null;
  if (!id || !ogr || !veliId) return hata('Kayıt bulunamadı', 404);
  const v = ogr.veliler.find((x) => x.id === veliId);
  if (!v) return hata('Bu veli öğrenciye bağlı değil', 404);
  await y.veliAyir(id, veliId);
  await y.islemYaz(o.sub, 'Ogrenci', id, 'Veli ayrıldı', maske(v.telefon));
  await y.islemYaz(o.sub, 'Veli', veliId, 'Öğrenciden ayrıldı', `${ogr.ad} ${ogr.soyad}`);
  return NextResponse.json({ ogrenci: await y.ogrenciKaydi(id) });
}
