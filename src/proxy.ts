import { NextResponse, type NextRequest } from 'next/server';
import { OTURUM_CEREZI, anaSayfa, oturumCoz } from '@/lib/session';
import { OKUL_CEREZI, slugGecerli } from '@/lib/slug';
import type { Rol } from '@/lib/types';

/**
 * Site kapalıdır: giriş ve yasal sayfalar dışında her yer oturum ister; her alan kendi rolüne açıktır.
 * Okula özel giriş adresleri (kardelenokul.com/{okul-adi}) herkese açıktır; bilinmeyen adres sayfada 404 verir.
 */
const ALANLAR: { onek: string; roller: Rol[] }[] = [
  { onek: '/veli', roller: ['veli'] },
  { onek: '/ogretmen', roller: ['ogretmen'] },
  { onek: '/okul', roller: ['okul'] },
  { onek: '/yonetim', roller: ['yonetim'] },
  { onek: '/api/veli', roller: ['veli'] },
  { onek: '/api/listeler', roller: ['ogretmen', 'okul', 'yonetim'] },
  { onek: '/api/katalog', roller: ['ogretmen', 'okul', 'yonetim'] },
  { onek: '/api/yonetim', roller: ['yonetim'] },
];
const ACIK = ['/giris', '/yonetim/giris', '/yasal', '/api/auth', '/api/okul-logo', '/api/saglik'];

/** "/ornek-ortaokulu" gibi tek parçalı, ayrılmış olmayan adres */
function okulAdresi(pathname: string): boolean {
  const parca = pathname.slice(1);
  return !!parca && !parca.includes('/') && slugGecerli(parca);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (ACIK.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();

  const oturum = await oturumCoz(req.cookies.get(OTURUM_CEREZI)?.value);
  const api = pathname.startsWith('/api/');

  if (!oturum) {
    if (okulAdresi(pathname)) return NextResponse.next();
    if (api) return NextResponse.json({ hata: 'Oturum gerekli' }, { status: 401 });
    // Okula özel adresten gelen kullanıcı, oturumu düşünce yine okulunun giriş sayfasına döner
    const okul = req.cookies.get(OKUL_CEREZI)?.value;
    const hedef = pathname.startsWith('/yonetim') ? '/yonetim/giris' : okul && slugGecerli(okul) ? `/${okul}` : '/giris';
    return NextResponse.redirect(new URL(hedef, req.url));
  }

  // Geçici şifreyle giren kullanıcı yeni şifre belirleyene kadar başka bir yere gidemez
  if (oturum.sifreDegistir && pathname !== '/sifre-degistir') {
    if (api) return NextResponse.json({ hata: 'Önce şifrenizi değiştirin' }, { status: 403 });
    return NextResponse.redirect(new URL('/sifre-degistir', req.url));
  }

  if (pathname === '/') return NextResponse.redirect(new URL(anaSayfa(oturum.rol), req.url));

  const alan = ALANLAR.find((a) => pathname === a.onek || pathname.startsWith(a.onek + '/'));
  if (alan && !alan.roller.includes(oturum.rol)) {
    if (api) return NextResponse.json({ hata: 'Yetkiniz yok' }, { status: 403 });
    return NextResponse.redirect(new URL(anaSayfa(oturum.rol), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-mark.png|.*\\.(?:png|jpg|svg|webp|ico)$).*)'],
};
