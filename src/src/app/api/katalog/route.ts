import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { kalemAra } from '@/lib/kalem';

/** Okul, öğretmen ve Kardelen yayındaki kitapları ve setleri arar. Veliler bu uca erişemez. */
export async function GET(req: Request) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 100);
  return NextResponse.json({ kalemler: await kalemAra(q, 30) });
}
