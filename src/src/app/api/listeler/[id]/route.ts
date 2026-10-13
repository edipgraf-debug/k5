import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { listeErisimi } from '@/lib/listeler';
import { kalemleriGetir, satirAnahtari } from '@/lib/kalem';

const Satirlar = z.object({
  satirlar: z.array(z.object({
    urunId: z.number().int().positive().nullable().default(null),
    setId: z.number().int().positive().nullable().default(null),
    adet: z.number().int().min(1).max(50).default(1),
    zorunlu: z.boolean(),
    satisFiyati: z.number().nonnegative().nullable().default(null),
  }).refine((s) => !!s.urunId !== !!s.setId, 'Her satır bir ürün ya da bir set olmalı')).max(200),
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
  const benzersiz = new Map(g.veri.satirlar.map((s) => [satirAnahtari(s), s.setId ? { ...s, urunId: null } : s]));
  const mevcut = await kalemleriGetir([...benzersiz.values()]);
  if (Object.keys(mevcut).length !== benzersiz.size) return hata('Listede katalogda olmayan ürün ya da set var');

  await r.listeSatirlariKaydet(id, [...benzersiz.values()]);
  return NextResponse.json({ liste: await r.liste(id) });
}
