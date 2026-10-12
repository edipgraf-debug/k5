import { NextResponse } from 'next/server';
import { repo } from '@/lib/data/repo';
import { hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { LOGO_MAX_BAYT, logoKaydet, logoSil, logoTuru } from '@/lib/depo/logo';

/** Okul logosu yükle (multipart, alan adı "logo"; PNG / JPG / WEBP, en fazla 1 MB). Yükleme gösterimi açmaz. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const r = await repo();
  const id = Number((await ctx.params).id);
  const okul = await r.okul(id);
  if (!okul) return hata('Okul bulunamadı', 404);

  const uzunluk = Number(req.headers.get('content-length') ?? 0);
  if (uzunluk > LOGO_MAX_BAYT + 64 * 1024) return hata('Logo en fazla 1 MB olabilir', 413);
  let dosya: FormDataEntryValue | null;
  try { dosya = (await req.formData()).get('logo'); } catch { return hata('Geçersiz istek'); }
  if (!(dosya instanceof File)) return hata('Logo dosyası seçin');
  if (dosya.size > LOGO_MAX_BAYT) return hata('Logo en fazla 1 MB olabilir', 413);
  const icerik = new Uint8Array(await dosya.arrayBuffer());
  const tur = logoTuru(icerik);
  if (!tur) return hata('Yalnız PNG, JPG veya WEBP yüklenebilir');

  const ad = await logoKaydet(okul.kod, icerik, tur);
  await r.okulGirisGuncelle(id, { logoDosya: ad });
  await logoSil(okul.logoDosya);
  return NextResponse.json({ okul: await r.okul(id) });
}

/** Logoyu kaldırır; girişte logo gösterimi de kapanır. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const r = await repo();
  const id = Number((await ctx.params).id);
  const okul = await r.okul(id);
  if (!okul) return hata('Okul bulunamadı', 404);
  await r.okulGirisGuncelle(id, { logoDosya: null, logoGoster: false });
  await logoSil(okul.logoDosya);
  return NextResponse.json({ okul: await r.okul(id) });
}
