import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { sifreHashle } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { geciciSifreUret, idParam, yonetici } from '@/lib/yonetim-api';
import { geciciSifreEpostasi } from '@/lib/kullanici-bildirim';

const Sema = z.object({ islem: z.enum(['geciciSifre', 'kilitAc']), epostaGonder: z.boolean().default(true) });

/**
 * geciciSifre: yeni geçici şifre üretir (yanıtta bir kez döner, istenirse e-postayla gider); kullanıcı ilk girişte değiştirir.
 * kilitAc: hatalı denemeden doğan geçici kilidi kaldırır.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const p = id ? await y.personelKaydi(id) : null;
  if (!id || !p) return hata('Kullanıcı bulunamadı', 404);

  if (g.veri.islem === 'kilitAc') {
    await y.personelKilitAc(id);
    await y.islemYaz(o.sub, 'Kullanici', id, 'Giriş kilidi açıldı');
    return NextResponse.json({ kullanici: await y.personelKaydi(id) });
  }
  if (id === o.sub) return hata('Kendi şifrenizi "Şifremi değiştir" sayfasından değiştirin');
  const sifre = geciciSifreUret();
  await y.personelSifreAta(id, await sifreHashle(sifre), true);
  const ep = g.veri.epostaGonder ? await geciciSifreEpostasi(p, sifre, false) : null;
  await y.islemYaz(o.sub, 'Kullanici', id, 'Geçici şifre oluşturuldu', ep ? (ep.ok ? 'E-postayla gönderildi' : 'E-posta gönderilemedi') : 'E-posta gönderilmedi');
  return NextResponse.json({ kullanici: await y.personelKaydi(id), geciciSifre: sifre, epostaGonderildi: ep?.ok ?? false });
}
