import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { sifreHashle } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { geciciSifreUret, kayitIslemi, PersonelSema, yonetici } from '@/lib/yonetim-api';
import { personelGirdiKontrol } from '@/lib/kullanici-kontrol';
import { geciciSifreEpostasi } from '@/lib/kullanici-bildirim';
import { TIP_ADI } from '@/components/yonetim/etiketler';

const Yeni = PersonelSema.and(z.object({ epostaGonder: z.boolean().default(true) }));

/**
 * Yeni kullanıcı (öğretmen, okul yetkilisi, kitabevi). Geçici şifre üretilir, yanıtta BİR KEZ döner,
 * istenirse kullanıcıya e-postayla gider; kullanıcı ilk girişte kendi şifresini belirler.
 */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Yeni);
  if ('yanit' in g) return g.yanit;
  const { epostaGonder, ...girdi } = g.veri;
  const k = await personelGirdiKontrol(girdi);
  if (k) return hata(k);
  const y = await yonetimRepo();
  const sifre = geciciSifreUret();
  const id = await kayitIslemi(async () => y.personelEkle(girdi, await sifreHashle(sifre)));
  if (id instanceof Response) return id;
  const p = (await y.personelKaydi(id))!;
  const ep = epostaGonder ? await geciciSifreEpostasi(p, sifre, true) : null;
  await y.islemYaz(o.sub, 'Kullanici', id, 'Kullanıcı oluşturuldu', `${TIP_ADI[p.tip]}${p.okulAd ? ` · ${p.okulAd}` : ''}${ep ? (ep.ok ? ' · bilgiler e-postayla gönderildi' : ' · e-posta gönderilemedi') : ''}`);
  return NextResponse.json({ id, geciciSifre: sifre, epostaGonderildi: ep?.ok ?? false });
}
