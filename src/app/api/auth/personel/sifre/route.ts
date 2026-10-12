import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { yonetimRepo } from '@/lib/data/yonetim';
import { govde, hata, oturumAc } from '@/lib/api';
import { oturumAl, sifreDogrula, sifreHashle, sifreKuraliHatasi } from '@/lib/auth';

const Sema = z.object({ mevcut: z.string().min(1, 'Mevcut şifrenizi girin'), yeni: z.string(), yeniTekrar: z.string() });

/** Öğretmen, okul ve kitabevi kullanıcısının kendi şifresini değiştirmesi (geçici şifreden sonra zorunlu). */
export async function POST(req: Request) {
  const o = await oturumAl();
  if (!o || o.rol === 'veli') return hata('Oturum gerekli', 401);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const kural = sifreKuraliHatasi(g.veri.yeni);
  if (kural) return hata(kural);
  if (g.veri.yeni !== g.veri.yeniTekrar) return hata('Yeni şifreler aynı değil');
  if (g.veri.yeni === g.veri.mevcut) return hata('Yeni şifre mevcut şifreden farklı olmalı');

  const y = await yonetimRepo();
  const k = await y.personelKaydi(o.sub);
  const p = k && k.aktif ? await (await repo()).personelEpostayla(k.eposta) : null;
  if (!p) return hata('Hesap bulunamadı', 404);
  if (!(await sifreDogrula(g.veri.mevcut, p.sifreHash))) return hata('Mevcut şifre hatalı', 401);
  await y.personelSifreAta(p.id, await sifreHashle(g.veri.yeni), false);
  return oturumAc({ sub: o.sub, rol: o.rol, ad: o.ad, okulId: o.okulId });
}
