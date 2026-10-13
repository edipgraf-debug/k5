import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Ayar tablosunda saklanan operatör şifreleri / API anahtarları için AES-256-GCM.
 * Anahtar: AYAR_ANAHTARI (önerilen, en az 32 karakter), yoksa SESSION_SECRET'tan türetilir.
 * Şifreli değer ekrana ve kayıtlara hiç gönderilmez.
 */
function anahtar(): Buffer {
  const k = process.env.AYAR_ANAHTARI || process.env.SESSION_SECRET || 'gelistirme-icin-gecici-anahtar-degistirin-0123456789';
  return createHash('sha256').update(`kardelen-ayar:${k}`).digest();
}

export function sifrele(duz: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', anahtar(), iv);
  const veri = Buffer.concat([c.update(duz, 'utf8'), c.final()]);
  return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${veri.toString('base64')}`;
}

/** Çözülemezse (anahtar değişmiş) null */
export function coz(sifreli: string | undefined | null): string | null {
  if (!sifreli) return null;
  const p = sifreli.split(':');
  if (p.length !== 4 || p[0] !== 'v1') return null;
  try {
    const d = createDecipheriv('aes-256-gcm', anahtar(), Buffer.from(p[1], 'base64'));
    d.setAuthTag(Buffer.from(p[2], 'base64'));
    return Buffer.concat([d.update(Buffer.from(p[3], 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
