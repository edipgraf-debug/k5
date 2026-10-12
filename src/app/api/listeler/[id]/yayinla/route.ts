import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { listeErisimi, listeYayinla, YayinHatasi } from '@/lib/listeler';

const Sema = z.object({
  sms: z.boolean().default(true),
  eposta: z.boolean().default(true),
  hedef: z.enum(['toplu', 'secili']).default('toplu'),
  ogrenciIdleri: z.array(z.number().int().positive()).max(5000).optional(),
  hatirlatma: z.boolean().optional(),
}).refine((v) => v.sms || v.eposta || !v.hatirlatma, { message: 'Hatırlatma için SMS veya e-posta seçin' });

/**
 * Tavsiye sepetini yayınlar (onay gerekmez):
 *  - hedef "toplu": sınıftaki tüm öğrencilere açılır, tüm velilere bildirim gider
 *  - hedef "secili": yalnız seçilen öğrencilere açılır (önceki seçimlere eklenir)
 *  - hatirlatma: sepeti açık olan seçili öğrencilerin velilerine yeniden bildirim
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;

  const r = await repo();
  const liste = await r.liste(Number((await ctx.params).id));
  if (!liste) return hata('Sepet bulunamadı', 404);
  if (!(await listeErisimi(o, liste))) return hata('Bu sepeti yayınlama yetkiniz yok', 403);
  if (!liste.satirlar.length) return hata('Boş sepet yayınlanamaz');

  try {
    const sonuc = await listeYayinla(o, liste, g.veri);
    return NextResponse.json({ sonuc, liste: await r.liste(liste.id) });
  } catch (e) {
    if (e instanceof YayinHatasi) return hata(e.message);
    throw e;
  }
}
