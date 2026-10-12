import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { kayitIslemi, OgrenciSema, VeliSema, yonetici } from '@/lib/yonetim-api';

/** Öğrenci arama: ad, okul no ya da veli telefonu */
export async function GET(req: Request) {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  const p = new URL(req.url).searchParams;
  const ogrenciler = await (await yonetimRepo()).ogrenciAra({
    q: p.get('q') ?? '', okulId: Number(p.get('okulId')) || null, subeId: Number(p.get('subeId')) || null, pasifDahil: p.get('pasif') === '1', limit: 100,
  });
  return NextResponse.json({ ogrenciler });
}

const Yeni = OgrenciSema.extend({ okulId: z.number().int().positive('Okul seçin'), veli: VeliSema.optional() });

/** Yeni öğrenci (isteğe bağlı ilk veliyle birlikte) */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Yeni);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  if ((await y.subeOkulu(g.veri.subeId)) !== g.veri.okulId) return hata('Şube bu okula ait değil');
  const { veli, ...ogr } = g.veri;
  const id = await kayitIslemi(() => y.ogrenciEkle(ogr));
  if (id instanceof Response) return id;
  await y.islemYaz(o.sub, 'Ogrenci', id, 'Öğrenci eklendi', `${ogr.ad} ${ogr.soyad} · no ${ogr.okulNo}`);
  let veliMesaj: string | null = null;
  if (veli) {
    const b = await kayitIslemi(() => y.veliBagla(id, veli));
    if (!(b instanceof Response)) {
      await y.islemYaz(o.sub, 'Ogrenci', id, 'Veli bağlandı', `${veli.telefon.slice(0, 3)} *** ** ${veli.telefon.slice(8)}${b.yeni ? ' (yeni veli)' : ' (kayıtlı veli)'}`);
      veliMesaj = b.yeni ? 'Veli eklendi' : 'Telefon kayıtlı bir veliye ait; kardeş olarak bağlandı';
    }
  }
  return NextResponse.json({ id, veliMesaj });
}
