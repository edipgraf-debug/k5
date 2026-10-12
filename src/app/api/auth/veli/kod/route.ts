import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata, istemciIp } from '@/lib/api';
import { SMS_KOD_SURESI_DK, SMS_TEKRAR_BEKLEME_SN, smsKoduHash, smsKoduUret, telefonMaskele, telefonNormalize } from '@/lib/auth';
import { sms } from '@/lib/notify/sms';
import { demoModu } from '@/lib/ortam';

const Sema = z.object({ telefon: z.string().min(10, 'Telefon numarasını girin'), amac: z.enum(['IlkGiris', 'SifreSifirlama']).default('IlkGiris') });

export async function POST(req: Request) {
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const telefon = telefonNormalize(g.veri.telefon);
  if (!telefon) return hata('Geçerli bir cep telefonu numarası girin (5XX XXX XX XX).');

  const r = await repo();
  const veli = await r.veliTelefonla(telefon);
  if (!veli) return hata('Bu numara sistemde kayıtlı değil. Öğrenci ve veli bilgilerini okulunuz yükler; lütfen okulunuzla iletişime geçin.', 404);

  const son = await r.sonSmsKodu(telefon, g.veri.amac);
  if (son && Date.now() - new Date(son.olusturma).getTime() < SMS_TEKRAR_BEKLEME_SN * 1000) {
    return hata(`Yeni kod için ${SMS_TEKRAR_BEKLEME_SN} saniye bekleyin.`, 429);
  }

  const kod = smsKoduUret();
  await r.smsKoduKaydet({ telefon, kodHash: smsKoduHash(telefon, kod), amac: g.veri.amac, sonGecerlilik: new Date(Date.now() + SMS_KOD_SURESI_DK * 60_000), ip: istemciIp(req) });
  const sonuc = await sms().gonder(telefon, `Kardelen Okul dogrulama kodunuz: ${kod}. ${SMS_KOD_SURESI_DK} dakika gecerlidir. Kimseyle paylasmayin.`);
  if (!sonuc.ok) return hata('SMS gönderilemedi, lütfen biraz sonra tekrar deneyin.', 502);

  // SMS kodu ekranda: yalnız geliştirmede ya da test (demo) sitesinde; gerçek SMS firması bağlıyken asla
  const gelistirme = (process.env.NODE_ENV !== 'production' || demoModu()) && process.env.SMS_PROVIDER !== 'http';
  return NextResponse.json({ ok: true, maskeliTelefon: telefonMaskele(telefon), sureDk: SMS_KOD_SURESI_DK, ...(gelistirme ? { gelistirmeKodu: kod } : {}) });
}
