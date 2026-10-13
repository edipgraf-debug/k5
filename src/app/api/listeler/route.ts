import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { izinliSecenekler, listeErisimi, okulBelirle } from '@/lib/listeler';
import { kalemleriGetir } from '@/lib/kalem';

export async function GET(req: Request) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const r = await repo();
  const istenen = Number(new URL(req.url).searchParams.get('okulId')) || null;
  const okullar = o.rol === 'yonetim' ? await r.okullar() : [];
  const okulId = okulBelirle(o, istenen ?? okullar[0]?.id ?? null);
  if (!okulId) return NextResponse.json({ okulId: null, okullar, secenekler: [], listeler: [], kalemler: {} });

  const secenekler = await izinliSecenekler(o, okulId);
  const tum = await r.okulListeleri(okulId);
  const listeler = [];
  for (const l of tum) if (await listeErisimi(o, l)) listeler.push(l);
  const kalemler = await kalemleriGetir(listeler.flatMap((l) => l.satirlar));
  return NextResponse.json({ okulId, okullar, secenekler, listeler, kalemler });
}

const Yeni = z.object({
  okulId: z.number().int().optional(),
  ad: z.string().trim().min(2, 'Liste adı girin').max(200),
  kapsam: z.enum(['Seviye', 'Sube']),
  id: z.number().int(),          // SinifId veya SubeId
});

export async function POST(req: Request) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Yeni);
  if ('yanit' in g) return g.yanit;
  const okulId = okulBelirle(o, g.veri.okulId);
  if (!okulId) return hata('Okul seçin');

  const izinli = await izinliSecenekler(o, okulId);
  if (!izinli.some((s) => s.kapsam === g.veri.kapsam && s.id === g.veri.id)) return hata('Bu sınıf/şube için liste oluşturma yetkiniz yok', 403);

  const r = await repo();
  const liste = await r.listeOlustur({
    okulId, ad: g.veri.ad, kapsam: g.veri.kapsam, olusturanId: o.sub,
    ...(g.veri.kapsam === 'Sube' ? { subeId: g.veri.id } : { sinifId: g.veri.id }),
  });
  return NextResponse.json({ liste });
}
