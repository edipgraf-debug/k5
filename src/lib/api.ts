import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { OTURUM_CEREZI, OTURUM_MAX_AGE, cerezAyarlari, oturumImzala, anaSayfa } from './session';
import type { Oturum } from './types';

export const SIFRE_DEGISTIR = '/sifre-degistir';

export function hata(mesaj: string, durum = 400) {
  return NextResponse.json({ hata: mesaj }, { status: durum });
}

export async function govde<T>(req: Request, sema: ZodType<T>): Promise<{ veri: T } | { yanit: NextResponse }> {
  let ham: unknown;
  try {
    ham = await req.json();
  } catch {
    return { yanit: hata('Geçersiz istek') };
  }
  const s = sema.safeParse(ham);
  if (!s.success) return { yanit: hata(s.error.issues[0]?.message ?? 'Geçersiz istek') };
  return { veri: s.data };
}

export async function oturumAc(o: Oturum, ek: Record<string, unknown> = {}) {
  const res = NextResponse.json({ ok: true, yonlendir: o.sifreDegistir ? SIFRE_DEGISTIR : anaSayfa(o.rol), ...ek });
  res.cookies.set(OTURUM_CEREZI, await oturumImzala(o), cerezAyarlari(OTURUM_MAX_AGE));
  return res;
}

export function istemciIp(req: Request): string | undefined {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
}
