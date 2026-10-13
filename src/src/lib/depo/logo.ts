import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Okul logoları web uygulamasının dışında, kalıcı bir klasörde tutulur (LOGO_DIZINI).
 * Next.js "public" klasörüne çalışma anında eklenen dosyaları sunmadığı için logolar /api/okul-logo/{slug} ile verilir.
 */
export const LOGO_MAX_BAYT = 1024 * 1024; // 1 MB

function dizin() {
  return path.resolve(process.env.LOGO_DIZINI || path.join(process.cwd(), 'veri', 'okul-logolari'));
}

const TIPLER = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as const;
export type LogoUzanti = keyof typeof TIPLER;

/** Dosya içeriğinden tür tespiti (uzantıya ya da istemcinin bildirdiği türe güvenilmez). SVG kabul edilmez. */
export function logoTuru(b: Uint8Array): LogoUzanti | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp';
  return null;
}

const GUVENLI = /^[a-z0-9][a-z0-9._-]{0,190}\.(png|jpg|webp)$/;

export async function logoKaydet(okulKod: string, icerik: Uint8Array, uzanti: LogoUzanti): Promise<string> {
  const ad = `${okulKod.toLowerCase().replace(/[^a-z0-9-]/g, '')}-${Date.now()}.${uzanti}`;
  await mkdir(dizin(), { recursive: true });
  await writeFile(path.join(dizin(), ad), icerik);
  return ad;
}

export async function logoOku(dosya: string): Promise<{ icerik: Buffer; tip: string } | null> {
  if (!GUVENLI.test(dosya)) return null;
  try {
    const icerik = await readFile(path.join(dizin(), dosya));
    const uz = dosya.split('.').pop() as LogoUzanti;
    return { icerik, tip: TIPLER[uz] };
  } catch {
    return null;
  }
}

export async function logoSil(dosya: string | null) {
  if (!dosya || !GUVENLI.test(dosya)) return;
  await unlink(path.join(dizin(), dosya)).catch(() => undefined);
}
