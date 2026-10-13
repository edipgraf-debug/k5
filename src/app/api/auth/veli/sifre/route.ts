import { cookies } from 'next/headers';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata, istemciIp, oturumAc } from '@/lib/api';
import { sifreHashle, sifreKuraliHatasi, telefonMaskele } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { DOGRULAMA_CEREZI, dogrulamaCoz } from '@/lib/session';

const Sema = z.object({
  adSoyad: z.string().trim().max(150).optional(),
  sifre: z.string(),
  sifreTekrar: z.string(),
});

/** SMS doğrulamasından sonra velinin şifresini belirler ve oturum açar. */
export async function POST(req: Request) {
  const c = await cookies();
  const dogrulama = await dogrulamaCoz(c.get(DOGRULAMA_CEREZI)?.value);
  if (!dogrulama) return hata('Doğrulama süresi doldu. Lütfen yeniden SMS kodu isteyin.', 401);

  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  if (g.veri.sifre !== g.veri.sifreTekrar) return hata('Şifreler aynı değil.');
  const kural = sifreKuraliHatasi(g.veri.sifre);
  if (kural) return hata(kural);

  const r = await repo();
  const veli = await r.veliTelefonla(dogrulama.telefon);
  if (!veli) return hata('Kayıt bulunamadı.', 404);

  await r.veliGuncelle(veli.id, {
    sifreHash: await sifreHashle(g.veri.sifre),
    adSoyad: g.veri.adSoyad || undefined,
    telefonDogrulandi: true,
    basarisizGiris: 0,
    kilitBitis: null,
    sonGiris: new Date(),
  });
  try {
    await (await ticaretRepo()).girisYaz({ tip: 'Veli', veliId: veli.id, kimlik: telefonMaskele(veli.telefon), rol: 'veli', basarili: true,
      sebep: 'SMS ile şifre belirledi', ip: istemciIp(req) ?? null, tarayici: req.headers.get('user-agent') });
  } catch { /* yok say */ }
  const res = await oturumAc({ sub: veli.id, rol: 'veli', ad: g.veri.adSoyad || veli.adSoyad || 'Veli' });
  res.cookies.delete(DOGRULAMA_CEREZI);
  return res;
}
