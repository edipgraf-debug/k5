import type { Rol } from '@/lib/types';

export type MenuOgesi = { ad: string; href: string } | { ad: string; grup: { ad: string; href: string }[] } | { ad: string; katalog: true };

/** Her rolün logonun altındaki menü bandı. "katalog" öğesi kategori ağacıyla açılır. */
export const MENULER: Record<Rol, MenuOgesi[]> = {
  veli: [
    { ad: 'Tavsiye sepeti', href: '/veli' },
    { ad: 'Katalog', katalog: true },
    { ad: 'Kampanyalar', href: '/kampanyalar' },
    { ad: 'Siparişlerim', href: '/veli/siparisler' },
    { ad: 'Hesabım', href: '/veli/hesap' },
  ],
  ogretmen: [
    { ad: 'Ana sayfa', href: '/ogretmen' },
    { ad: 'Tavsiye sepetleri', href: '/ogretmen/listeler' },
    { ad: 'Öğrencilerim', href: '/ogretmen/ogrenciler' },
    { ad: 'Katalog', katalog: true },
    { ad: 'Kampanyalar', href: '/kampanyalar' },
  ],
  okul: [
    { ad: 'Ana sayfa', href: '/okul' },
    { ad: 'Tavsiye sepetleri', href: '/okul/listeler' },
    { ad: 'Sınıflar & öğrenciler', href: '/okul/ogrenciler' },
    { ad: 'Hakediş', href: '/okul/hakedis' },
    { ad: 'Katalog', katalog: true },
    { ad: 'Kampanyalar', href: '/kampanyalar' },
  ],
  plasiyer: [
    { ad: 'Ana sayfa', href: '/plasiyer' },
    { ad: 'Okullarım', href: '/plasiyer/okullar' },
    { ad: 'Öğretmenler', href: '/plasiyer/ogretmenler' },
    { ad: 'Tahsilatlar', href: '/plasiyer/tahsilatlar' },
    { ad: 'Sepet raporları', href: '/plasiyer/raporlar' },
    { ad: 'Katalog', katalog: true },
    { ad: 'Kampanyalar', href: '/kampanyalar' },
  ],
  yonetim: [
    { ad: 'Ana sayfa', href: '/yonetim' },
    { ad: 'Okul & kişiler', grup: [
      { ad: 'Okullar', href: '/yonetim/okullar' }, { ad: 'Öğrenci & veli', href: '/yonetim/ogrenciler' },
      { ad: 'Kullanıcılar', href: '/yonetim/kullanicilar' }, { ad: 'Plasiyerler', href: '/yonetim/plasiyerler' },
      { ad: 'Hakediş', href: '/yonetim/hakedis' }, { ad: 'Hızlı arama', href: '/yonetim/ara' }] },
    { ad: 'Ürün & katalog', grup: [
      { ad: 'Ürünler', href: '/yonetim/urunler' }, { ad: 'Kategori ağacı', href: '/yonetim/kategoriler' }, { ad: 'Setler', href: '/yonetim/setler' },
      { ad: 'Tavsiye sepetleri', href: '/yonetim/listeler' }, { ad: 'Kampanyalar', href: '/yonetim/kampanyalar' }] },
    { ad: 'Satış & raporlar', grup: [
      { ad: 'Tahsilatlar', href: '/yonetim/tahsilatlar' }, { ad: 'Sepet raporları', href: '/yonetim/raporlar' }, { ad: 'Loglar', href: '/yonetim/loglar' }] },
    { ad: 'Site ayarları', grup: [
      { ad: 'Firma & WhatsApp', href: '/yonetim/ayarlar' }, { ad: 'Ödeme ayarları', href: '/yonetim/ayarlar/odeme' },
      { ad: 'Havale / EFT', href: '/yonetim/ayarlar/havale' }, { ad: 'Kargo & kurye', href: '/yonetim/ayarlar/kargo' },
      { ad: 'SMS & e-posta operatörü', href: '/yonetim/ayarlar/bildirim' }, { ad: 'Kurumsal sayfalar', href: '/yonetim/sayfalar' }] },
    { ad: 'Katalog', katalog: true },
  ],
};

export const ROL_ROZETI: Partial<Record<Rol, string>> = { yonetim: 'KİTABEVİ · YÖNETİM', plasiyer: 'PLASİYER', okul: 'OKUL YÖNETİMİ', ogretmen: 'ÖĞRETMEN' };
