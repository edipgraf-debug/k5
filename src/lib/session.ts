import { SignJWT, jwtVerify } from 'jose';
import type { Oturum, Rol } from './types';

export const OTURUM_CEREZI = 'ko_oturum';
export const DOGRULAMA_CEREZI = 'ko_dogrulama';
const OTURUM_SURESI_SN = 8 * 60 * 60;   // 8 saat
const DOGRULAMA_SURESI_SN = 10 * 60;    // SMS doğrulamasından sonra şifre belirleme penceresi

function anahtar(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET en az 32 karakter olmalı');
    return new TextEncoder().encode('gelistirme-icin-gecici-anahtar-degistirin-0123456789');
  }
  return new TextEncoder().encode(s);
}

export async function oturumImzala(o: Oturum): Promise<string> {
  return new SignJWT({ rol: o.rol, ad: o.ad, okulId: o.okulId, ...(o.sifreDegistir ? { sd: true } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(o.sub))
    .setIssuedAt()
    .setExpirationTime(`${OTURUM_SURESI_SN}s`)
    .sign(anahtar());
}

export async function oturumCoz(token: string | undefined): Promise<Oturum | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, anahtar(), { algorithms: ['HS256'] });
    const rol = payload.rol as Rol;
    if (!['veli', 'ogretmen', 'okul', 'yonetim'].includes(rol)) return null;
    return {
      sub: Number(payload.sub),
      rol,
      ad: String(payload.ad ?? ''),
      okulId: payload.okulId == null ? undefined : Number(payload.okulId),
      ...(payload.sd === true ? { sifreDegistir: true } : {}),
    };
  } catch {
    return null;
  }
}

/** SMS kodu doğrulandıktan sonra, şifre belirlenene kadar geçerli kısa ömürlü belirteç. */
export async function dogrulamaImzala(telefon: string, amac: string): Promise<string> {
  return new SignJWT({ amac })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(telefon)
    .setIssuedAt()
    .setExpirationTime(`${DOGRULAMA_SURESI_SN}s`)
    .sign(anahtar());
}

export async function dogrulamaCoz(token: string | undefined): Promise<{ telefon: string; amac: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, anahtar(), { algorithms: ['HS256'] });
    return { telefon: String(payload.sub), amac: String(payload.amac) };
  } catch {
    return null;
  }
}

export const cerezAyarlari = (maxAge: number) => ({
  httpOnly: true,
  // Canlıda HTTPS (Cloudflare/IIS) arkasında true; yerel HTTP denemesi için COOKIE_SECURE=false verilebilir.
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export const OTURUM_MAX_AGE = OTURUM_SURESI_SN;
export const DOGRULAMA_MAX_AGE = DOGRULAMA_SURESI_SN;

export function anaSayfa(rol: Rol): string {
  switch (rol) {
    case 'veli': return '/veli';
    case 'ogretmen': return '/ogretmen';
    case 'okul': return '/okul';
    case 'yonetim': return '/yonetim';
  }
}
