import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetici } from '@/lib/yonetim-api';

/** Set / kampanya / kategori formlarında ürün arama (satıştakiler; ?kategoriId= ile kategorinin ürünleri) */
export async function GET(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const u = new URL(req.url).searchParams;
  const q = (u.get('q') ?? '').slice(0, 100);
  const boy = Math.min(300, Math.max(1, Number(u.get('boy')) || 20));
  const kategoriId = Number(u.get('kategoriId')) || null;
  const { satirlar } = await (await ticaretRepo()).urunListesi({ q, durum: kategoriId ? 'tum' : 'aktif', sayfaBoyu: boy, kategoriId });
  return NextResponse.json({ urunler: satirlar.map((u) => ({ id: u.id, ad: u.ad, barkod: u.barkod, yayinevi: u.yayinevi, fiyat: u.fiyat, kategoriIdleri: u.kategoriIdleri, aktif: u.aktif })) });
}
