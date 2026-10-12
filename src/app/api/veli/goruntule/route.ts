import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';

const Sema = z.object({ ogrenciId: z.number().int().positive() });

/** Veli bir öğrencisinin sepetini açtığında kaydedilir (sepet detayındaki "açtı" bilgisi). */
export async function POST(req: Request) {
  const o = await rolGerekli('veli');
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const r = await repo();
  if (!(await r.veliOgrencileri(o.sub)).some((x) => x.id === g.veri.ogrenciId)) return hata('Yetkiniz yok', 403);
  for (const l of await r.ogrenciListeleri(g.veri.ogrenciId)) await r.goruntulemeKaydet(l.id, g.veri.ogrenciId, o.sub);
  return NextResponse.json({ ok: true });
}
