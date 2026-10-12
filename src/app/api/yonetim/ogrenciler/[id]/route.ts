import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { farklar, idParam, kayitIslemi, OgrenciSema, yonetici } from '@/lib/yonetim-api';

const ADLAR = { okulNo: 'okul no', ad: 'ad', soyad: 'soyad', subeId: 'şube', aktif: 'durum' };

/** Öğrenci bilgileri ve şubesi (okul değiştirilemez; başka okula geçen öğrenci yeni kayıt olarak açılır) */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, OgrenciSema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const once = id ? await y.ogrenciKaydi(id) : null;
  if (!id || !once) return hata('Öğrenci bulunamadı', 404);
  if ((await y.subeOkulu(g.veri.subeId)) !== once.okulId) return hata('Şube öğrencinin okuluna ait değil');
  const s = await kayitIslemi(() => y.ogrenciGuncelle(id, g.veri));
  if (s instanceof Response) return s;
  const f = farklar(once as unknown as Record<string, unknown>, g.veri, ADLAR);
  if (f) await y.islemYaz(o.sub, 'Ogrenci', id, g.veri.aktif === once.aktif ? 'Öğrenci bilgileri güncellendi' : g.veri.aktif ? 'Öğrenci aktif edildi' : 'Öğrenci pasif edildi', f);
  return NextResponse.json({ ogrenci: await y.ogrenciKaydi(id) });
}
