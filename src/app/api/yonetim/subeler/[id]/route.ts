import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, kayitIslemi, yonetici } from '@/lib/yonetim-api';

/** Boş şubeyi sil (öğrencisi ya da tavsiye sepeti olan şube silinmez) */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const y = await yonetimRepo();
  const okulId = id ? await y.subeOkulu(id) : null;
  if (!id || !okulId) return hata('Şube bulunamadı', 404);
  const ad = (await y.okulSiniflari(okulId)).flatMap((s) => s.subeler.map((b) => ({ ...b, tam: `${s.seviye}-${b.ad}` }))).find((b) => b.id === id)?.tam;
  const s = await kayitIslemi(() => y.subeSil(id));
  if (s instanceof Response) return s;
  await y.islemYaz(o.sub, 'Okul', okulId, 'Şube silindi', ad ?? null);
  return NextResponse.json({ siniflar: await y.okulSiniflari(okulId) });
}
