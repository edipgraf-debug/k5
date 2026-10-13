import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, plasiyerKontrol, yonetici } from '@/lib/yonetim-api';

const Sema = z.object({ plasiyerId: z.number().int().positive().nullable() });

/** Öğretmene okulunkinden farklı plasiyer ata (null = okulun plasiyeri geçerli olur). */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const k = id ? await y.personelKaydi(id) : null;
  if (!id || !k) return hata('Kullanıcı bulunamadı', 404);
  if (k.tip !== 'Ogretmen') return hata('Plasiyer yalnız öğretmene özel atanabilir; okul yetkilisi okulun plasiyerini kullanır');
  const pk = await plasiyerKontrol(g.veri.plasiyerId);
  if (pk) return hata(pk);
  if (k.plasiyerId === g.veri.plasiyerId) return NextResponse.json({ ok: true });
  await y.ogretmenPlasiyerAta(id, g.veri.plasiyerId);
  const yeni = await y.personelKaydi(id);
  await y.islemYaz(o.sub, 'Kullanici', id, g.veri.plasiyerId ? 'Öğretmene özel plasiyer atandı' : 'Öğretmen okulun plasiyerine döndü',
    `${k.gecerliPlasiyerAd ?? 'yok'} → ${yeni?.gecerliPlasiyerAd ?? 'yok'}`);
  return NextResponse.json({ ok: true });
}
