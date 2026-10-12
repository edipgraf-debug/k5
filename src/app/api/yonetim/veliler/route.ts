import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { telefonNormalize } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { yonetici } from '@/lib/yonetim-api';

/** Veli ekleme formunda: bu telefon kayıtlı mı, kimlerin velisi? */
export async function GET(req: Request) {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  const t = telefonNormalize(new URL(req.url).searchParams.get('telefon') ?? '');
  if (!t) return NextResponse.json({ veli: null });
  return NextResponse.json({ veli: await (await yonetimRepo()).veliTelefonKaydi(t) });
}
