/** İstemcide de kullanılan okul yetkilisi yetkileri (sunucudaki YETKILER ile aynı) */
export const YETKILER_LISTESI: { kod: 'KitapListe' | 'TopluSiparis' | 'TedarikRapor' | 'SiparisRapor' | 'Hakedis' | 'OgrenciYonetim' | 'KullaniciYonetim'; ad: string }[] = [
  { kod: 'KitapListe', ad: 'Tavsiye sepeti hazırlama ve yayınlama' },
  { kod: 'TopluSiparis', ad: 'Toplu sipariş verme' },
  { kod: 'TedarikRapor', ad: 'Öğrenci tedarik durumu' },
  { kod: 'SiparisRapor', ad: 'Sipariş raporları' },
  { kod: 'Hakedis', ad: 'Hakediş' },
  { kod: 'OgrenciYonetim', ad: 'Öğrenci yönetimi' },
  { kod: 'KullaniciYonetim', ad: 'Okul kullanıcılarını yönetme' },
];
