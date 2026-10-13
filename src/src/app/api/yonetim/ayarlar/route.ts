import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { yonetici } from '@/lib/yonetim-api';
import { AYAR_GRUPLARI, ayarAnahtari, guvenliAyarlar, type AyarGrubu } from '@/lib/ayar-api';
import { sifrele } from '@/lib/sifreleme';
import { bildirimAyarlariniYenile } from '@/lib/notify/ayar';

const Sema = z.object({
  grup: z.enum(Object.keys(AYAR_GRUPLARI) as [AyarGrubu, ...AyarGrubu[]]),
  degerler: z.record(z.string(), z.unknown()),
  sifre: z.string().max(500).optional(),      // yalnız sms / eposta: yeni şifre (boş = değiştirme)
  sifreSil: z.boolean().optional(),
});

const GRUP_ADI: Record<AyarGrubu, string> = { firma: 'Firma bilgileri', whatsapp: 'WhatsApp destek', odeme: 'Ödeme ayarları', havale: 'Havale / EFT',
  kargo: 'Kargo ayarları', sms: 'SMS operatörü', eposta: 'E-posta operatörü' };

export async function GET() {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  return NextResponse.json(await guvenliAyarlar());
}

/** Bir ayar grubunu kaydeder. Operatör şifresi şifrelenerek saklanır, yanıtta ve kayıtta yer almaz. */
export async function PUT(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const s = AYAR_GRUPLARI[g.veri.grup].safeParse(g.veri.degerler);
  if (!s.success) return hata(s.error.issues[0]?.message ?? 'Geçersiz değer');
  const t = await ticaretRepo();
  const once = await t.ayarlar();
  const yeni: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.data as Record<string, string>)) yeni[ayarAnahtari(g.veri.grup, k)] = v;
  let sifreDegisti = false;
  if (g.veri.grup === 'sms' || g.veri.grup === 'eposta') {
    const k = `${g.veri.grup}.sifre`;
    if (g.veri.sifreSil) { yeni[k] = ''; sifreDegisti = true; }
    else if (g.veri.sifre?.trim()) { yeni[k] = sifrele(g.veri.sifre.trim()); sifreDegisti = true; }
  }
  await t.ayarlarKaydet(yeni);
  bildirimAyarlariniYenile();
  const degisen = Object.keys(yeni).filter((k) => !k.endsWith('.sifre') && (once[k] ?? '') !== yeni[k]).map((k) => k.split('.').pop());
  if (sifreDegisti) degisen.push('şifre');
  if (degisen.length) await (await yonetimRepo()).islemYaz(o.sub, 'Ayar', 0, `${GRUP_ADI[g.veri.grup]} güncellendi`, `Değişen: ${degisen.join(', ')}`);
  return NextResponse.json(await guvenliAyarlar());
}
