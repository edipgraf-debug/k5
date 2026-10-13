import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  if (!id) return hata('Ödeme bulunamadı', 404);
  const t = await ticaretRepo();
  if (!(await t.havaleOnayla(id, o.sub))) return hata('Bu ödeme onay bekleyen bir havale değil', 409);
  const s = (await t.tahsilatlar({})).find((x) => x.id === id);
  await (await yonetimRepo()).islemYaz(o.sub, 'Odeme', id, 'Havale onaylandı', s ? `${s.siparisNo} · ${s.tutar.toFixed(2)} ₺` : null);
  return NextResponse.json({ ok: true });
}
