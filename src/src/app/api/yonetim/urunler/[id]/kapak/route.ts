import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';
import { KAPAK_MAX_BAYT, gorselTuru, kapakKaydet, kapakSil } from '@/lib/depo/kapak';

/** Ürün kapak görseli (multipart, alan "kapak"; PNG / JPG / WEBP, en fazla 1 MB) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const t = await ticaretRepo();
  const urun = id ? await t.urunKaydi(id) : null;
  if (!id || !urun) return hata('Ürün bulunamadı', 404);
  if (Number(req.headers.get('content-length') ?? 0) > KAPAK_MAX_BAYT + 64 * 1024) return hata('Görsel en fazla 1 MB olabilir', 413);
  let dosya: FormDataEntryValue | null;
  try { dosya = (await req.formData()).get('kapak'); } catch { return hata('Geçersiz istek'); }
  if (!(dosya instanceof File)) return hata('Görsel seçin');
  if (dosya.size > KAPAK_MAX_BAYT) return hata('Görsel en fazla 1 MB olabilir', 413);
  const icerik = new Uint8Array(await dosya.arrayBuffer());
  const tur = gorselTuru(icerik);
  if (!tur) return hata('Yalnız PNG, JPG veya WEBP yüklenebilir');
  const ad = await kapakKaydet(id, icerik, tur);
  await t.urunKapak(id, ad);
  await kapakSil(urun.kapakDosya);
  await (await yonetimRepo()).islemYaz(o.sub, 'Urun', id, 'Kapak görseli yüklendi', urun.ad);
  return NextResponse.json({ urun: await t.urunKaydi(id) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const t = await ticaretRepo();
  const urun = id ? await t.urunKaydi(id) : null;
  if (!id || !urun) return hata('Ürün bulunamadı', 404);
  await t.urunKapak(id, null);
  await kapakSil(urun.kapakDosya);
  await (await yonetimRepo()).islemYaz(o.sub, 'Urun', id, 'Kapak görseli kaldırıldı', urun.ad);
  return NextResponse.json({ urun: await t.urunKaydi(id) });
}
