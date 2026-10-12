'use client';

import { useEffect } from 'react';
import { OKUL_CEREZI } from '@/lib/slug';

/** Okula özel adresten gelen kullanıcıyı, çıkışta ve oturum düştüğünde aynı adrese döndürmek için hatırlar. */
export default function OkulHatirla({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `${OKUL_CEREZI}=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [slug]);
  return null;
}
