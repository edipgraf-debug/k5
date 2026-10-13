import 'server-only';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { hata } from './api';
import { rolGerekli, telefonNormalize } from './auth';
import { KayitHatasi } from './data/yonetim';
import type { Oturum } from './types';

/** Yalnız kitabevi (Kardelen yönetim) kullanıcıları. */
export async function yonetici(): Promise<Oturum | null> {
  return rolGerekli('yonetim');
}

/** Bilinen kayıt hatalarını 409 olarak döndürür; diğerlerini yukarı atar. */
export async function kayitIslemi<T>(f: () => Promise<T>): Promise<T | Response> {
  try {
    return await f();
  } catch (e) {
    if (e instanceof KayitHatasi) return hata(e.message, 409);
    throw e;
  }
}

export const idParam = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const bosNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const istegeBagliMetin = (max: number) => z.preprocess(bosNull, z.string().trim().max(max).nullable().default(null));
const istegeBagliEposta = z.preprocess(bosNull, z.string().trim().toLowerCase().email('Geçerli bir e-posta girin').max(150).nullable().default(null));

/** "0532 000 00 00", "+90 532..." → "5320000000" */
export const telefonAlani = z.string().trim().transform((v, ctx) => {
  const t = telefonNormalize(v);
  if (!t) { ctx.addIssue({ code: 'custom', message: 'Telefon 5XX XXX XX XX biçiminde olmalı' }); return z.NEVER; }
  return t;
});
const istegeBagliTelefon = z.preprocess(bosNull, telefonAlani.nullable().default(null));
/** Okul sabit telefonu: 10 hane (alan kodu dahil) */
const sabitTelefon = z.preprocess(bosNull, z.string().trim().transform((v) => v.replace(/\D/g, '').replace(/^0/, '')).refine((v) => v.length === 10, 'Telefon 10 haneli olmalı (alan koduyla)').nullable().default(null));

export const OkulSema = z.object({
  kod: z.string().trim().toUpperCase().min(2, 'Okul kodu girin').max(20).regex(/^[A-Z0-9-]+$/, 'Kod yalnız harf, rakam ve tire içerebilir'),
  ad: z.string().trim().min(3, 'Okul adını girin').max(200),
  il: z.string().trim().min(2, 'İl girin').max(50),
  ilce: z.string().trim().min(2, 'İlçe girin').max(50),
  adres: istegeBagliMetin(500),
  telefon: sabitTelefon,
  eposta: istegeBagliEposta,
  opakCariKodu: istegeBagliMetin(30),
  opakWebCariKodu: istegeBagliMetin(30),
  aktif: z.boolean().default(true),
  plasiyerId: z.number().int().positive().nullable().default(null),
});

export const VeliSema = z.object({
  telefon: telefonAlani,
  adSoyad: istegeBagliMetin(150),
  eposta: istegeBagliEposta,
  yakinlik: istegeBagliMetin(30),
});

export const OgrenciSema = z.object({
  okulNo: z.string().trim().min(1, 'Okul numarası girin').max(20),
  ad: z.string().trim().min(1, 'Ad girin').max(100),
  soyad: z.string().trim().min(1, 'Soyad girin').max(100),
  subeId: z.number({ message: 'Şube seçin' }).int().positive('Şube seçin'),
  aktif: z.boolean().default(true),
});

export const PersonelSema = z.object({
  tip: z.enum(['Yonetim', 'Plasiyer', 'Okul', 'Ogretmen'], { message: 'Rol seçin' }),
  okulId: z.number().int().positive().nullable().default(null),
  adSoyad: z.string().trim().min(3, 'Ad soyad girin').max(150),
  eposta: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin').max(150),
  telefon: istegeBagliTelefon,
  aktif: z.boolean().default(true),
  yetkiler: z.array(z.enum(['TopluSiparis', 'SiparisRapor', 'TedarikRapor', 'Hakedis', 'OgrenciYonetim', 'KitapListe', 'KullaniciYonetim'])).default([]),
  subeIdleri: z.array(z.number().int().positive()).max(100).default([]),
  opakPlasiyerKodu: z.preprocess(bosNull, z.string().trim().toUpperCase().max(30).nullable().default(null)),
  plasiyerId: z.number().int().positive().nullable().default(null),   // öğretmen: okulunkinden farklı plasiyer
}).superRefine((v, ctx) => {
  const kitabevi = v.tip === 'Yonetim' || v.tip === 'Plasiyer';
  if (!kitabevi && !v.okulId) ctx.addIssue({ code: 'custom', path: ['okulId'], message: 'Okul seçin' });
  if (kitabevi && v.okulId) ctx.addIssue({ code: 'custom', path: ['okulId'], message: 'Kitabevi kullanıcısı ve plasiyer bir okula bağlanmaz' });
}).transform((v) => ({ ...v, opakPlasiyerKodu: v.tip === 'Plasiyer' ? v.opakPlasiyerKodu : null, plasiyerId: v.tip === 'Ogretmen' ? v.plasiyerId : null }));

/** Atanan kişinin aktif bir plasiyer olduğunu denetler; hata mesajı ya da null. */
export async function plasiyerKontrol(plasiyerId: number | null): Promise<string | null> {
  if (!plasiyerId) return null;
  const { yonetimRepo } = await import('./data/yonetim');
  const p = await (await yonetimRepo()).personelKaydi(plasiyerId);
  return p && p.tip === 'Plasiyer' && p.aktif ? null : 'Seçilen plasiyer bulunamadı ya da pasif';
}

const HARFLER = 'abcdefghjkmnpqrstuvwxyz';
const RAKAMLAR = '23456789';
/** Okunması kolay geçici şifre, ör. "mesk-4827-tavu" (harf + rakam; l, i, o, 0, 1 gibi karışan karakterler yok). */
export function geciciSifreUret(): string {
  const p = (n: number, a: string) => Array.from({ length: n }, () => a[randomInt(a.length)]).join('');
  return `${p(4, HARFLER)}-${p(4, RAKAMLAR)}-${p(4, HARFLER)}`;
}

/** İşlem kaydı için değişen alanları yazar (şifre asla). */
export function farklar(once: Record<string, unknown>, sonra: Record<string, unknown>, adlar: Record<string, string>): string | null {
  const l: string[] = [];
  for (const [k, ad] of Object.entries(adlar)) {
    const a = JSON.stringify(once[k] ?? null), b = JSON.stringify(sonra[k] ?? null);
    if (a !== b) l.push(ad);
  }
  return l.length ? `Değişen: ${l.join(', ')}` : null;
}
