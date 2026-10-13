import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const y = await yonetimRepo();
  const parti = id ? await y.yuklemeParti(id) : null;
  if (!parti) return hata('Yükleme bulunamadı', 404);
  if (parti.durum !== 'Onizleme') return hata('Bu yükleme zaten tamamlanmış', 409);
  await y.yuklemeBitir(parti.id, 'IptalEdildi', 0);
  return NextResponse.json({ ok: true });
}
