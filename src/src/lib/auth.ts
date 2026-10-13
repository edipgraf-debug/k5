import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OTURUM_CEREZI, oturumCoz } from './session';
import type { Oturum, Rol } from './types';

export const SMS_KOD_SURESI_DK = Number(process.env.SMS_KOD_SURESI_DK ?? 5);
export const SMS_KOD_MAX_DENEME = 5;
export const SMS_TEKRAR_BEKLEME_SN = 60;
export const GIRIS_MAX_HATA = 5;
export const GIRIS_KILIT_DK = 15;

/** Türkiye cep telefonunu 10 haneye (5xxxxxxxxx) indirir; geçersizse null. */
export function telefonNormalize(girdi: string): string | null {
  let d = (girdi || '').replace(/\D/g, '');
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : null;
}

export function telefonMaskele(t: string): string {
  return `+90 ${t.slice(0, 3)} *** ** ${t.slice(8)}`;
}

export function smsKoduUret(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function smsKoduHash(telefon: string, kod: string): string {
  const tuz = process.env.SESSION_SECRET ?? 'gelistirme';
  return createHash('sha256').update(`${tuz}:${telefon}:${kod}`).digest('hex');
}

export function hashEsit(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function sifreHashle(sifre: string): Promise<string> {
  return bcrypt.hash(sifre, 12);
}

export async function sifreDogrula(sifre: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(sifre, hash);
}

export function sifreKuraliHatasi(sifre: string): string | null {
  if (!sifre || sifre.length < 8) return 'Şifre en az 8 karakter olmalı.';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(sifre) || !/\d/.test(sifre)) return 'Şifre en az bir harf ve bir rakam içermeli.';
  return null;
}

export async function oturumAl(): Promise<Oturum | null> {
  const c = await cookies();
  return oturumCoz(c.get(OTURUM_CEREZI)?.value);
}

/** Route handler'larda kullanılır; izin yoksa null döner. */
export async function rolGerekli(...roller: Rol[]): Promise<Oturum | null> {
  const o = await oturumAl();
  if (!o || !roller.includes(o.rol)) return null;
  return o;
}
