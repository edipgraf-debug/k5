import 'server-only';
import { z } from 'zod';
import { ean13Gecerli } from './barkod';
import { ticaretRepo } from './data/ticaret';

export const SetSema = z.object({
  barkod: z.string().trim().regex(/^[0-9A-Za-z-]{4,30}$/, 'Barkod 4-30 karakter; harf, rakam ve tire').refine((b) => !/^\d{13}$/.test(b) || ean13Gecerli(b), 'EAN-13 barkodun kontrol hanesi hatalı'),
  ad: z.string().trim().min(2, 'Set adını girin').max(300),
  aciklama: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(1000).nullable().default(null)),
  fiyat: z.number().nonnegative('Fiyat negatif olamaz').max(1_000_000).nullable().default(null),
  aktif: z.boolean().default(true),
  satirlar: z.array(z.object({ urunId: z.number().int().positive(), adet: z.number().int().min(1).max(50) })).min(1, 'Sete en az bir ürün ekleyin').max(100),
}).refine((v) => v.satirlar.reduce((a, s) => a + s.adet, 0) >= 2, { message: 'Set en az 2 adet ürün içermeli', path: ['satirlar'] })
  .refine((v) => new Set(v.satirlar.map((s) => s.urunId)).size === v.satirlar.length, { message: 'Aynı ürün iki kez eklenmiş; adetini artırın', path: ['satirlar'] });

/** Setteki ürünler var ve satışta mı? Hata mesajı ya da null. */
export async function setUrunKontrol(urunIdleri: number[]): Promise<string | null> {
  const t = await ticaretRepo();
  for (const id of urunIdleri) {
    const u = await t.urunKaydi(id);
    if (!u) return 'Sette bulunmayan bir ürün var';
    if (!u.aktif) return `"${u.ad}" satışta değil; sete eklenemez`;
  }
  return null;
}
