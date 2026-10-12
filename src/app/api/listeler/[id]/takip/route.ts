import { NextResponse } from 'next/server';
import { repo } from '@/lib/data/repo';
import { hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { listeErisimi } from '@/lib/listeler';

/** Sepetin sınıfındaki öğrenciler: yayın penceresindeki öğrenci seçimi ve sepet detayı için. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const r = await repo();
  const liste = await r.liste(Number((await ctx.params).id));
  if (!liste) return hata('Sepet bulunamadı', 404);
  if (!(await listeErisimi(o, liste))) return hata('Yetkiniz yok', 403);
  return NextResponse.json({ liste, takip: await r.listeTakip(liste.id) });
}
