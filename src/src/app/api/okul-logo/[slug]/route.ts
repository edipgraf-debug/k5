import { repo } from '@/lib/data/repo';
import { logoOku } from '@/lib/depo/logo';
import { slugGecerli } from '@/lib/slug';
import { oturumAl } from '@/lib/auth';

/** Okula özel giriş sayfasındaki logo (herkese açık). Gösterim kapalıysa 404; Kardelen yönetim ekranı ?onizleme=1 ile kapalı logoyu da görebilir. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!slugGecerli(slug)) return new Response(null, { status: 404 });
  const okul = await (await repo()).okulSlugla(slug);
  const onizleme = new URL(req.url).searchParams.has('onizleme') && (await oturumAl())?.rol === 'yonetim';
  if (!okul?.logoDosya || (!okul.logoGoster && !onizleme)) return new Response(null, { status: 404 });
  const logo = await logoOku(okul.logoDosya);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(logo.icerik), {
    headers: { 'Content-Type': logo.tip, 'Cache-Control': onizleme ? 'private, no-store' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" },
  });
}
