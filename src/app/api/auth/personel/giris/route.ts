import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata, oturumAc } from '@/lib/api';
import { GIRIS_KILIT_DK, GIRIS_MAX_HATA, sifreDogrula } from '@/lib/auth';
import type { Rol } from '@/lib/types';

const Sema = z.object({
  eposta: z.string().trim().email('Geçerli bir e-posta girin'),
  sifre: z.string().min(1, 'Şifrenizi girin'),
  rol: z.enum(['ogretmen', 'okul', 'yonetim']),
});

const TIP: Record<'ogretmen' | 'okul' | 'yonetim', 'Ogretmen' | 'Okul' | 'Yonetim'> = { ogretmen: 'Ogretmen', okul: 'Okul', yonetim: 'Yonetim' };

export async function POST(req: Request) {
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const r = await repo();
  const p = await r.personelEpostayla(g.veri.eposta);
  const genel = 'E-posta veya şifre hatalı.';
  if (!p || p.tip !== TIP[g.veri.rol]) return hata(genel, 401);
  if (p.kilitBitis && new Date(p.kilitBitis).getTime() > Date.now()) return hata(`Çok fazla hatalı deneme. ${GIRIS_KILIT_DK} dakika sonra tekrar deneyin.`, 429);

  if (!(await sifreDogrula(g.veri.sifre, p.sifreHash))) {
    const n = p.basarisizGiris + 1;
    await r.personelGuncelle(p.id, n >= GIRIS_MAX_HATA ? { basarisizGiris: 0, kilitBitis: new Date(Date.now() + GIRIS_KILIT_DK * 60_000) } : { basarisizGiris: n });
    return hata(genel, 401);
  }
  await r.personelGuncelle(p.id, { basarisizGiris: 0, kilitBitis: null, sonGiris: new Date() });
  // NOT: Yönetim hesapları için SMS ile ikinci adım doğrulama (tasarımdaki "Yönetim girişi") sonraki adımda eklenecek.
  return oturumAc({ sub: p.id, rol: g.veri.rol as Rol, ad: p.adSoyad, okulId: p.okulId ?? undefined, ...(p.sifreDegistirmeli ? { sifreDegistir: true } : {}) });
}
