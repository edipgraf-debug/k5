import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata, istemciIp, oturumAc } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { GIRIS_KILIT_DK, GIRIS_MAX_HATA, sifreDogrula } from '@/lib/auth';
import type { Rol } from '@/lib/types';

const Sema = z.object({
  eposta: z.string().trim().email('Geçerli bir e-posta girin'),
  sifre: z.string().min(1, 'Şifrenizi girin'),
  rol: z.enum(['ogretmen', 'okul', 'yonetim']),
});

/** İstenen giriş ekranı → kabul edilen kullanıcı tipleri. Plasiyerler kitabevi giriş ekranından girer. */
const TIPLER: Record<'ogretmen' | 'okul' | 'yonetim', ('Ogretmen' | 'Okul' | 'Yonetim' | 'Plasiyer')[]> = { ogretmen: ['Ogretmen'], okul: ['Okul'], yonetim: ['Yonetim', 'Plasiyer'] };
const ROL: Record<'Ogretmen' | 'Okul' | 'Yonetim' | 'Plasiyer', Rol> = { Ogretmen: 'ogretmen', Okul: 'okul', Yonetim: 'yonetim', Plasiyer: 'plasiyer' };

/** Giriş denemesini kayda yazar; kayıt hatası girişi engellemez. Şifre yazılmaz. */
async function kaydet(req: Request, g: { kimlik: string; kullaniciId?: number; rol?: string; basarili: boolean; sebep?: string }) {
  try {
    await (await ticaretRepo()).girisYaz({ tip: 'Personel', ...g, ip: istemciIp(req) ?? null, tarayici: req.headers.get('user-agent') });
  } catch { /* yok say */ }
}

export async function POST(req: Request) {
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const r = await repo();
  const p = await r.personelEpostayla(g.veri.eposta);
  const genel = 'E-posta veya şifre hatalı.';
  const kimlik = g.veri.eposta.toLowerCase();
  if (!p || !TIPLER[g.veri.rol].includes(p.tip)) { await kaydet(req, { kimlik, kullaniciId: p?.id, basarili: false, sebep: p ? 'Yanlış giriş ekranı' : 'Bilinmeyen hesap' }); return hata(genel, 401); }
  if (p.kilitBitis && new Date(p.kilitBitis).getTime() > Date.now()) {
    await kaydet(req, { kimlik, kullaniciId: p.id, basarili: false, sebep: 'Hesap kilitli' });
    return hata(`Çok fazla hatalı deneme. ${GIRIS_KILIT_DK} dakika sonra tekrar deneyin.`, 429);
  }

  if (!(await sifreDogrula(g.veri.sifre, p.sifreHash))) {
    const n = p.basarisizGiris + 1;
    await r.personelGuncelle(p.id, n >= GIRIS_MAX_HATA ? { basarisizGiris: 0, kilitBitis: new Date(Date.now() + GIRIS_KILIT_DK * 60_000) } : { basarisizGiris: n });
    await kaydet(req, { kimlik, kullaniciId: p.id, basarili: false, sebep: n >= GIRIS_MAX_HATA ? 'Hatalı şifre · hesap kilitlendi' : 'Hatalı şifre' });
    return hata(genel, 401);
  }
  await r.personelGuncelle(p.id, { basarisizGiris: 0, kilitBitis: null, sonGiris: new Date() });
  // NOT: Yönetim hesapları için SMS ile ikinci adım doğrulama (tasarımdaki "Yönetim girişi") sonraki adımda eklenecek.
  await kaydet(req, { kimlik, kullaniciId: p.id, rol: ROL[p.tip], basarili: true });
  return oturumAc({ sub: p.id, rol: ROL[p.tip], ad: p.adSoyad, okulId: p.okulId ?? undefined, ...(p.sifreDegistirmeli ? { sifreDegistir: true } : {}) });
}
