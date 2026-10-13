import 'server-only';
import { z } from 'zod';
import { ticaretRepo } from './data/ticaret';

const metin = (max: number) => z.string().trim().max(max).default('');
const bit = z.boolean().transform((b) => (b ? '1' : '0'));
const tutar = z.preprocess((v) => (v === '' || v == null ? '' : v), z.union([z.literal(''), z.number().nonnegative().max(1_000_000)]))
  .transform((v) => (v === '' ? '' : String(Math.round(Number(v) * 100) / 100)));

/** Ayar grupları: anahtar önekleri ve doğrulama. Şifre alanları ayrı işlenir (boş = değiştirme). */
export const AYAR_GRUPLARI = {
  firma: z.object({
    unvan: z.string().trim().min(2, 'Ticari unvanı girin').max(200),
    adres: metin(500), eposta: z.union([z.literal(''), z.string().trim().email('Geçerli bir e-posta girin')]).default(''),
    telefon: z.string().trim().transform((v) => v.replace(/\D/g, '').replace(/^0/, '')).refine((v) => !v || v.length === 10, 'Telefon 10 haneli olmalı (alan koduyla)'),
    vergiDairesi: metin(100), vergiNo: z.string().trim().refine((v) => !v || /^\d{10,11}$/.test(v), 'Vergi / TC kimlik no 10-11 hane'),
    mersisNo: z.string().trim().refine((v) => !v || /^\d{16}$/.test(v), 'MERSİS no 16 hane'), calismaSaatleri: metin(150),
  }),
  whatsapp: z.object({
    aktif: bit,
    numara: z.string().trim().transform((v) => { let d = v.replace(/\D/g, ''); if (d.startsWith('0')) d = `9${d}`; if (d.length === 10) d = `90${d}`; return d; })
      .refine((v) => !v || /^90\d{10}$/.test(v), 'WhatsApp numarası 0532 000 00 00 biçiminde olmalı'),
    mesaj: metin(300), saatler: metin(150),
  }).refine((v) => v.aktif === '0' || !!v.numara, { message: 'Destek açıkken numara girin', path: ['numara'] }),
  odeme: z.object({
    kartAktif: bit, havaleAktif: bit, maxTaksit: z.number().int().min(1).max(12).transform(String), taksitAltLimit: tutar,
  }).refine((v) => v.kartAktif === '1' || v.havaleAktif === '1', 'En az bir ödeme yöntemi açık olmalı'),
  havale: z.object({ aciklama: metin(500), sureGun: z.number().int().min(1).max(14).transform(String) }),
  kargo: z.object({ varsayilanUcret: tutar, ucretsizLimit: tutar, okulaTeslimAktif: bit }),
  sms: z.object({
    saglayici: z.enum(['console', 'netgsm', 'iletimerkezi', 'http']), baslik: metin(20), kullanici: metin(100),
    apiUrl: z.union([z.literal(''), z.string().trim().url('Geçerli bir adres girin').refine((u) => u.startsWith('https://'), 'Adres https:// ile başlamalı')]).default(''),
  }),
  eposta: z.object({
    saglayici: z.enum(['console', 'smtp']), smtpSunucu: metin(200), smtpPort: z.number().int().min(1).max(65535).transform(String), guvenli: bit,
    kullanici: metin(150), gonderen: metin(200),
  }),
} as const;
export type AyarGrubu = keyof typeof AYAR_GRUPLARI;

/** Grup değerlerini Ayar anahtarlarına çevirir (havale.sureGun → HavaleSureGun gibi istisnalar dahil) */
export function ayarAnahtari(grup: AyarGrubu, alan: string) {
  if (grup === 'havale' && alan === 'sureGun') return 'HavaleSureGun';
  return `${grup}.${alan}`;
}

export const SIFRELI = ['sms.sifre', 'eposta.sifre'];

/** Ekrana gidecek ayarlar: şifreli değerler çıkarılır, yalnız kayıtlı olup olmadığı söylenir */
export async function guvenliAyarlar() {
  const a = await (await ticaretRepo()).ayarlar();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) if (!SIFRELI.includes(k)) out[k] = v;
  return { ayarlar: out, sifreKayitli: Object.fromEntries(SIFRELI.map((k) => [k, !!a[k]])) as Record<string, boolean> };
}
