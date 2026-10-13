import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { LogoUzanti } from './logo';

export { logoTuru as gorselTuru } from './logo';

/** Sitede yüklenen ürün kapakları; okul logoları gibi uygulama dışındaki kalıcı klasörde (KAPAK_DIZINI). */
export const KAPAK_MAX_BAYT = 1024 * 1024;
const TIPLER = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as const;
const GUVENLI = /^urun-\d{1,9}-\d{10,15}\.(png|jpg|webp)$/;

function dizin() {
  return path.resolve(process.env.KAPAK_DIZINI || path.join(process.cwd(), 'veri', 'urun-kapaklari'));
}

export async function kapakKaydet(urunId: number, icerik: Uint8Array, uzanti: LogoUzanti): Promise<string> {
  const ad = `urun-${urunId}-${Date.now()}.${uzanti}`;
  await mkdir(dizin(), { recursive: true });
  await writeFile(path.join(dizin(), ad), icerik);
  return ad;
}

export async function kapakOku(dosya: string): Promise<{ icerik: Buffer; tip: string } | null> {
  if (!GUVENLI.test(dosya)) return null;
  try {
    return { icerik: await readFile(path.join(dizin(), dosya)), tip: TIPLER[dosya.split('.').pop() as LogoUzanti] };
  } catch {
    return null;
  }
}

export async function kapakSil(dosya: string | null) {
  if (!dosya || !GUVENLI.test(dosya)) return;
  await unlink(path.join(dizin(), dosya)).catch(() => undefined);
}
