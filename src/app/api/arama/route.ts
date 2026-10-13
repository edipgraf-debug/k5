import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { oturumAl } from '@/lib/auth';
import { kalemAra } from '@/lib/kalem';

/** Üst çubuktaki canlı arama (tüm oturumlu kullanıcılar): ürün ve setler, fiyat ve depo stoku ile */
export async function GET(req: Request) {
  if (!(await oturumAl())) return hata('Oturum gerekli', 401);
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ kalemler: [] });
  return NextResponse.json({ kalemler: await kalemAra(q, 10) });
}
