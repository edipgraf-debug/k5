import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { telefonNormalize } from '@/lib/auth';
import { yonetici } from '@/lib/yonetim-api';
import { sms } from '@/lib/notify/sms';
import { epostaGonder } from '@/lib/notify/email';
import { bildirimAyarlari } from '@/lib/notify/ayar';
import { yonetimRepo } from '@/lib/data/yonetim';

const Sema = z.object({ kanal: z.enum(['SMS', 'Eposta']), alici: z.string().trim().min(5).max(150) });

/** Kayıtlı operatör ayarıyla deneme gönderimi */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const a = await bildirimAyarlari();
  let sonuc;
  if (g.veri.kanal === 'SMS') {
    const tel = telefonNormalize(g.veri.alici);
    if (!tel) return hata('Geçerli bir cep telefonu girin');
    sonuc = await sms().gonder(tel, 'Kardelen Okul deneme mesajidir.');
  } else {
    if (!z.string().email().safeParse(g.veri.alici).success) return hata('Geçerli bir e-posta girin');
    sonuc = await epostaGonder(g.veri.alici, 'Kardelen Okul deneme e-postası', '<p>Bu bir deneme e-postasıdır. E-posta ayarlarınız çalışıyor.</p>', 'Bu bir deneme e-postasıdır.');
  }
  await (await yonetimRepo()).islemYaz(o.sub, 'Ayar', 0, `${g.veri.kanal === 'SMS' ? 'SMS' : 'E-posta'} deneme gönderimi`, sonuc.ok ? 'başarılı' : `hata: ${sonuc.hata?.slice(0, 200)}`);
  const saglayici = g.veri.kanal === 'SMS' ? a.sms.saglayici : a.eposta.saglayici;
  return NextResponse.json({ ok: sonuc.ok, hata: sonuc.hata ?? null, saglayici, konsol: saglayici === 'console' });
}
