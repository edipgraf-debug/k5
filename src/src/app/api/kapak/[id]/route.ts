import { ticaretRepo } from '@/lib/data/ticaret';
import { kapakOku } from '@/lib/depo/kapak';

/** Ürün kapak görseli (giriş gerekmez; yalnız görsel). /api/kapak/{urunId} */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });
  const urun = await (await ticaretRepo()).urunKaydi(id);
  const kapak = urun?.kapakDosya ? await kapakOku(urun.kapakDosya) : null;
  if (!kapak) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(kapak.icerik), {
    headers: { 'Content-Type': kapak.tip, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" },
  });
}
