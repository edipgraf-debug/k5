import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata, istemciIp, oturumAc } from '@/lib/api';
import { GIRIS_KILIT_DK, GIRIS_MAX_HATA, sifreDogrula, telefonMaskele, telefonNormalize } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';

async function kaydet(req: Request, g: { kimlik: string; veliId?: number; basarili: boolean; sebep?: string }) {
  try {
    await (await ticaretRepo()).girisYaz({ tip: 'Veli', rol: 'veli', ...g, ip: istemciIp(req) ?? null, tarayici: req.headers.get('user-agent') });
  } catch { /* yok say */ }
}

const Sema = z.object({ telefon: z.string(), sifre: z.string().min(1, 'Şifrenizi girin') });

export async function POST(req: Request) {
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const telefon = telefonNormalize(g.veri.telefon);
  if (!telefon) return hata('Geçerli bir cep telefonu numarası girin.');

  const r = await repo();
  const veli = await r.veliTelefonla(telefon);
  const genel = 'Telefon veya şifre hatalı.';
  const kimlik = telefonMaskele(telefon);
  if (!veli) { await kaydet(req, { kimlik, basarili: false, sebep: 'Bilinmeyen hesap' }); return hata(genel, 401); }
  if (veli.kilitBitis && new Date(veli.kilitBitis).getTime() > Date.now()) {
    await kaydet(req, { kimlik, veliId: veli.id, basarili: false, sebep: 'Hesap kilitli' });
    return hata(`Çok fazla hatalı deneme. ${GIRIS_KILIT_DK} dakika sonra tekrar deneyin veya SMS ile giriş yapın.`, 429);
  }
  if (!veli.sifreHash) return hata('Henüz şifre belirlemediniz. "İlk giriş: SMS kodu gönder" ile devam edin.', 409);

  if (!(await sifreDogrula(g.veri.sifre, veli.sifreHash))) {
    const n = veli.basarisizGiris + 1;
    await r.veliGuncelle(veli.id, n >= GIRIS_MAX_HATA
      ? { basarisizGiris: 0, kilitBitis: new Date(Date.now() + GIRIS_KILIT_DK * 60_000) }
      : { basarisizGiris: n });
    await kaydet(req, { kimlik, veliId: veli.id, basarili: false, sebep: 'Hatalı şifre' });
    return hata(genel, 401);
  }
  await kaydet(req, { kimlik, veliId: veli.id, basarili: true });
  await r.veliGuncelle(veli.id, { basarisizGiris: 0, kilitBitis: null, sonGiris: new Date() });
  return oturumAc({ sub: veli.id, rol: 'veli', ad: veli.adSoyad ?? 'Veli' });
}
