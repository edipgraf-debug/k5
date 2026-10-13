import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';

const Sema = z.object({ islem: z.enum(['sifreSifirla', 'kilitAc']) });

/**
 * sifreSifirla: velinin şifresi silinir; veli giriş ekranında "İlk giriş: SMS kodu gönder" ile yeni şifre belirler.
 * kilitAc: hatalı denemeden doğan geçici kilidi kaldırır.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  if (!id || !(await y.veliKaydi(id))) return hata('Veli bulunamadı', 404);
  if (g.veri.islem === 'sifreSifirla') {
    await y.veliSifreSifirla(id);
    await y.islemYaz(o.sub, 'Veli', id, 'Şifre sıfırlandı', 'Veli SMS koduyla yeni şifre belirleyecek');
  } else {
    await y.veliKilitAc(id);
    await y.islemYaz(o.sub, 'Veli', id, 'Giriş kilidi açıldı');
  }
  return NextResponse.json({ veli: await y.veliKaydi(id) });
}
