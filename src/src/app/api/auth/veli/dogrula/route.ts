import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { SMS_KOD_MAX_DENEME, hashEsit, smsKoduHash, telefonNormalize } from '@/lib/auth';
import { DOGRULAMA_CEREZI, DOGRULAMA_MAX_AGE, cerezAyarlari, dogrulamaImzala } from '@/lib/session';

const Sema = z.object({
  telefon: z.string(),
  kod: z.string().regex(/^\d{6}$/, '6 haneli kodu girin'),
  amac: z.enum(['IlkGiris', 'SifreSifirlama']).default('IlkGiris'),
});

export async function POST(req: Request) {
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const telefon = telefonNormalize(g.veri.telefon);
  if (!telefon) return hata('Geçersiz telefon');

  const r = await repo();
  const k = await r.sonSmsKodu(telefon, g.veri.amac);
  if (!k || k.kullanildi || new Date(k.sonGecerlilik).getTime() < Date.now()) return hata('Kodun süresi doldu. Yeni kod isteyin.');
  if (k.deneme >= SMS_KOD_MAX_DENEME) return hata('Çok fazla hatalı deneme. Yeni kod isteyin.', 429);

  if (!hashEsit(k.kodHash, smsKoduHash(telefon, g.veri.kod))) {
    await r.smsKoduGuncelle(k.id, { deneme: k.deneme + 1 });
    return hata(`Kod hatalı. Kalan deneme: ${SMS_KOD_MAX_DENEME - k.deneme - 1}`);
  }
  await r.smsKoduGuncelle(k.id, { kullanildi: true });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DOGRULAMA_CEREZI, await dogrulamaImzala(telefon, g.veri.amac), cerezAyarlari(DOGRULAMA_MAX_AGE));
  return res;
}
