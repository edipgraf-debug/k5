import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DOGRULAMA_CEREZI, OTURUM_CEREZI } from '@/lib/session';
import { OKUL_CEREZI, slugGecerli } from '@/lib/slug';

/** Çıkış: okula özel adresten girildiyse o adrese, değilse genel girişe döner. */
export async function POST() {
  const okul = (await cookies()).get(OKUL_CEREZI)?.value;
  const res = NextResponse.json({ ok: true, yonlendir: okul && slugGecerli(okul) ? `/${okul}` : '/giris' });
  res.cookies.delete(OTURUM_CEREZI);
  res.cookies.delete(DOGRULAMA_CEREZI);
  return res;
}
