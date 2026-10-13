import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetici } from '@/lib/yonetim-api';
import { icBarkodUret } from '@/lib/barkod';

/** Kullanılmayan iç (2 ile başlayan) EAN-13 barkod önerir */
export async function GET() {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const t = await ticaretRepo();
  for (let i = 0; i < 10; i++) {
    const b = icBarkodUret();
    if (!(await t.barkodKullanimi(b))) return NextResponse.json({ barkod: b });
  }
  return hata('Barkod üretilemedi, tekrar deneyin', 503);
}
