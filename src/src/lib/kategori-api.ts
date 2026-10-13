import 'server-only';
import { z } from 'zod';
import { slugOner } from './slug';

export const KategoriSema = z.object({
  ustId: z.number().int().positive().nullable().default(null),
  ad: z.string().trim().min(2, 'Kategori adını girin').max(150),
  slug: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? undefined : v), z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,160}$/, 'Adres yalnız küçük harf, rakam ve tire').optional()),
  sira: z.number().int().min(0).max(100000).default(0),
  aktif: z.boolean().default(true),
}).transform((v) => ({ ...v, slug: v.slug ?? slugOner(v.ad) }));
