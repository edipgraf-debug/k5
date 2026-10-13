import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { slugGecerli } from '@/lib/slug';

const Sema = z.object({
  slug: z.string().trim().toLowerCase().optional(),
  logoGoster: z.boolean().optional(),
});

/** Okul giriş sayfası ayarları: özel adres (slug) ve girişte logo gösterimi. Yalnız Kardelen yönetim. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const r = await repo();
  const id = Number((await ctx.params).id);
  const okul = await r.okul(id);
  if (!okul) return hata('Okul bulunamadı', 404);

  if (g.veri.slug !== undefined && !slugGecerli(g.veri.slug)) {
    return hata('Adres 3–80 karakter olmalı; yalnız küçük harf, rakam ve tire içermeli (giris, veli, okul gibi ayrılmış adlar kullanılamaz).');
  }
  if (g.veri.logoGoster && !okul.logoDosya) return hata('Önce logo yükleyin');
  try {
    await r.okulGirisGuncelle(id, { slug: g.veri.slug, logoGoster: g.veri.logoGoster });
  } catch (e) {
    if ((e as Error).message === 'SLUG_KULLANIMDA') return hata('Bu adres başka bir okulda kullanılıyor', 409);
    throw e;
  }
  return NextResponse.json({ okul: await r.okul(id) });
}
