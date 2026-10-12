import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { listeErisimi } from '@/lib/listeler';

const Satirlar = z.object({
  satirlar: z.array(z.object({
    urunId: z.number().int().positive(),
    adet: z.number().int().min(1).max(50).default(1),
    zorunlu: z.boolean(),
    satisFiyati: z.number().nonnegative().nullable().default(null),
  })).max(200),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const id = Number((await ctx.params).id);
  const r = await repo();
  const liste = await r.liste(id);
  if (!liste) return hata('Liste bulunamadı', 404);
  if (!(await listeErisimi(o, liste))) return hata('Bu listeyi düzenleme yetkiniz yok', 403);

  const g = await govde(req, Satirlar);
  if ('yanit' in g) return g.yanit;
  const benzersiz = new Map(g.veri.satirlar.map((s) => [s.urunId, s]));
  const mevcut = await r.urunler([...benzersiz.keys()]);
  if (mevcut.length !== benzersiz.size) return hata('Listede katalogda olmayan ürün var');

  await r.listeSatirlariKaydet(id, [...benzersiz.values()]);
  return NextResponse.json({ liste: await r.liste(id) });
}
