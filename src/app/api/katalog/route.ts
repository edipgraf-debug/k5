import { NextResponse } from 'next/server';
import { repo } from '@/lib/data/repo';
import { hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';

/** Okul, öğretmen ve Kardelen yayındaki tüm kitapları arar. Veliler bu uca erişemez. */
export async function GET(req: Request) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 100);
  return NextResponse.json({ urunler: await (await repo()).urunAra(q, 30) });
}
