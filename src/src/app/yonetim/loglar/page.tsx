import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { ticaretRepo } from '@/lib/data/ticaret';
import { gunBasi, gunSonu, tarihSaat } from '@/lib/bicim';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Loglar' };

type SP = { sekme?: string; q?: string; bas?: string; bit?: string; hedef?: string; tip?: string; sonuc?: string; kanal?: string; durum?: string };
const HEDEFLER = ['Okul', 'Ogrenci', 'Veli', 'Kullanici', 'Urun', 'Set', 'Kategori', 'Kampanya', 'Odeme', 'Hakedis', 'Ayar', 'Sayfa', 'Banka', 'Kargo', 'Pos'];
const HEDEF_ADI: Record<string, string> = { Ogrenci: 'Öğrenci', Kullanici: 'Kullanıcı', Urun: 'Ürün', Odeme: 'Ödeme', Hakedis: 'Hakediş', Pos: 'POS' };
const HEDEF_LINK: Record<string, string> = { Okul: '/yonetim/okullar/', Ogrenci: '/yonetim/ogrenciler/', Kullanici: '/yonetim/kullanicilar/', Urun: '/yonetim/urunler/',
  Set: '/yonetim/setler/', Kampanya: '/yonetim/kampanyalar/', Kategori: '/yonetim/kategoriler?id=' };

/** Log raporları: yönetim işlemleri (kim neyi değiştirdi), giriş denemeleri, SMS / e-posta bildirimleri */
export default async function Loglar({ searchParams }: { searchParams: Promise<SP> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const sekme = (['islem', 'giris', 'bildirim'] as const).find((x) => x === sp.sekme) ?? 'islem';
  const bas = gunBasi(sp.bas), bit = gunSonu(sp.bit);
  const sekmeLink = (s: string) => `/yonetim/loglar?sekme=${s}`;
  const filtreGenel = (
    <>
      <input type="hidden" name="sekme" value={sekme} />
      <div className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5"><label htmlFor="l-bas" className="etiket">Başlangıç</label><input id="l-bas" type="date" name="bas" defaultValue={sp.bas ?? ''} className="girdi" /></div>
      <div className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5"><label htmlFor="l-bit" className="etiket">Bitiş</label><input id="l-bit" type="date" name="bit" defaultValue={sp.bit ?? ''} className="girdi" /></div>
    </>
  );

  let icerik: React.ReactNode;
  if (sekme === 'islem') {
    const l = await (await yonetimRepo()).islemLog({ hedef: HEDEFLER.includes(sp.hedef ?? '') ? sp.hedef : null, q: sp.q, baslangic: bas, bitis: bit, limit: 300 });
    icerik = (
      <>
        <form method="get" className="kart flex flex-wrap items-end gap-3 p-5">
          {filtreGenel}
          <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5"><label htmlFor="l-h" className="etiket">Kayıt türü</label>
            <select id="l-h" name="hedef" defaultValue={sp.hedef ?? ''} className="girdi"><option value="">Tümü</option>{HEDEFLER.map((h) => <option key={h} value={h}>{HEDEF_ADI[h] ?? h}</option>)}</select></div>
          <div className="flex min-w-0 flex-[2_1_200px] flex-col gap-1.5"><label htmlFor="l-q" className="etiket">Ara</label><input id="l-q" name="q" type="search" defaultValue={sp.q ?? ''} className="girdi" placeholder="Kullanıcı, işlem, ayrıntı" /></div>
          <button type="submit" className="btn-koyu">Listele</button>
        </form>
        <Bolum id="islem" baslik={`${l.length} işlem`} ust="YÖNETİM İŞLEMLERİ">
          {l.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[860px]`}>
                <thead><tr>{['Tarih', 'Kullanıcı', 'Kayıt', 'İşlem', 'Ayrıntı'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {l.map((x) => (
                    <tr key={x.id}>
                      <td className={`${TABLO.td} whitespace-nowrap`}>{tarihSaat(x.tarih)}</td>
                      <td className={TABLO.td}>{x.kullanici}</td>
                      <td className={TABLO.td}>{HEDEF_LINK[x.hedef] && x.hedefId ? <Link href={`${HEDEF_LINK[x.hedef]}${x.hedefId}`}>{HEDEF_ADI[x.hedef] ?? x.hedef} #{x.hedefId}</Link> : HEDEF_ADI[x.hedef] ?? x.hedef}</td>
                      <td className={`${TABLO.td} font-bold`}>{x.islem}</td>
                      <td className={`${TABLO.td} text-[13px] text-metin-2`}>{x.ayrinti ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Kayıt yok.</Bos>}
        </Bolum>
      </>
    );
  } else if (sekme === 'giris') {
    const l = await (await ticaretRepo()).girisLog({ tip: sp.tip === 'Veli' || sp.tip === 'Personel' ? sp.tip : null, basarili: sp.sonuc === '1' ? true : sp.sonuc === '0' ? false : null,
      q: sp.q, baslangic: bas, bitis: bit, limit: 300 });
    icerik = (
      <>
        <form method="get" className="kart flex flex-wrap items-end gap-3 p-5">
          {filtreGenel}
          <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5"><label htmlFor="l-t" className="etiket">Kullanıcı tipi</label>
            <select id="l-t" name="tip" defaultValue={sp.tip ?? ''} className="girdi"><option value="">Tümü</option><option value="Veli">Veli</option><option value="Personel">Personel</option></select></div>
          <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5"><label htmlFor="l-s" className="etiket">Sonuç</label>
            <select id="l-s" name="sonuc" defaultValue={sp.sonuc ?? ''} className="girdi"><option value="">Tümü</option><option value="1">Başarılı</option><option value="0">Başarısız</option></select></div>
          <div className="flex min-w-0 flex-[2_1_200px] flex-col gap-1.5"><label htmlFor="l-q2" className="etiket">Ara</label><input id="l-q2" name="q" type="search" defaultValue={sp.q ?? ''} className="girdi" placeholder="E-posta, ad, IP" /></div>
          <button type="submit" className="btn-koyu">Listele</button>
        </form>
        <Bolum id="giris" baslik={`${l.length} giriş denemesi`} ust="GİRİŞ KAYITLARI" aksiyon={<span className="text-sm text-metin-2">Veli telefonları maskeli tutulur; şifreler kaydedilmez.</span>}>
          {l.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[860px]`}>
                <thead><tr>{['Tarih', 'Kişi', 'Kimlik', 'Rol', 'Sonuç', 'IP'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {l.map((x) => (
                    <tr key={x.id}>
                      <td className={`${TABLO.td} whitespace-nowrap`}>{tarihSaat(x.tarih)}</td>
                      <td className={TABLO.td}>{x.ad ?? '—'}<span className="block text-[12px] text-metin-3">{x.tip}</span></td>
                      <td className={TABLO.td}>{x.kimlik}</td>
                      <td className={TABLO.td}>{x.rol ?? '—'}</td>
                      <td className={TABLO.td}>{x.basarili ? <Rozet ton="yesil">Başarılı</Rozet> : <Rozet ton="kirmizi">{x.sebep ?? 'Başarısız'}</Rozet>}{x.basarili && x.sebep && <span className="block text-[12px] text-metin-3">{x.sebep}</span>}</td>
                      <td className={`${TABLO.td} text-[13px]`}>{x.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Kayıt yok.</Bos>}
        </Bolum>
      </>
    );
  } else {
    const l = await (await ticaretRepo()).bildirimLog({ kanal: sp.kanal === 'SMS' || sp.kanal === 'Eposta' ? sp.kanal : null,
      durum: (['Kuyrukta', 'Gonderildi', 'Hata'] as const).find((x) => x === sp.durum) ?? null, limit: 300 });
    icerik = (
      <>
        <form method="get" className="kart flex flex-wrap items-end gap-3 p-5">
          <input type="hidden" name="sekme" value="bildirim" />
          <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5"><label htmlFor="l-k" className="etiket">Kanal</label>
            <select id="l-k" name="kanal" defaultValue={sp.kanal ?? ''} className="girdi"><option value="">Tümü</option><option value="SMS">SMS</option><option value="Eposta">E-posta</option></select></div>
          <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5"><label htmlFor="l-d" className="etiket">Durum</label>
            <select id="l-d" name="durum" defaultValue={sp.durum ?? ''} className="girdi"><option value="">Tümü</option><option value="Gonderildi">Gönderildi</option><option value="Hata">Hata</option><option value="Kuyrukta">Kuyrukta</option></select></div>
          <button type="submit" className="btn-koyu">Listele</button>
        </form>
        <Bolum id="bildirim" baslik={`${l.length} bildirim`} ust="SMS / E-POSTA">
          {l.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[760px]`}>
                <thead><tr>{['Tarih', 'Kanal', 'Alıcı', 'Okul / sepet', 'Durum'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {l.map((x) => (
                    <tr key={x.id}>
                      <td className={`${TABLO.td} whitespace-nowrap`}>{tarihSaat(x.tarih)}</td>
                      <td className={TABLO.td}>{x.kanal === 'SMS' ? 'SMS' : 'E-posta'}</td>
                      <td className={TABLO.td}>{x.kanal === 'SMS' ? `0${x.alici.slice(0, 3)} *** ** ${x.alici.slice(8)}` : x.alici}</td>
                      <td className={TABLO.td}>{x.okulAd ?? '—'}<span className="block text-[12px] text-metin-3">{x.listeAd ?? ''}</span></td>
                      <td className={TABLO.td}>{x.durum === 'Gonderildi' ? <Rozet ton="yesil">Gönderildi</Rozet> : x.durum === 'Hata' ? <Rozet ton="kirmizi">Hata</Rozet> : <Rozet ton="sari">Kuyrukta</Rozet>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Kayıt yok.</Bos>}
        </Bolum>
      </>
    );
  }

  return (
    <Sayfa>
      <SayfaBasligi baslik="Log raporları" alt="Panelde yapılan değişiklikler, giriş denemeleri ve gönderilen bildirimler." />
      <nav aria-label="Log türü" className="flex flex-wrap gap-2">
        {([['islem', 'Yönetim işlemleri'], ['giris', 'Girişler'], ['bildirim', 'SMS / e-posta']] as const).map(([id, ad]) => (
          <Link key={id} href={sekmeLink(id)} aria-current={sekme === id ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-[10px] border-2 px-4 font-baslik text-sm font-bold no-underline ${sekme === id ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white text-lacivert'}`}>{ad}</Link>
        ))}
      </nav>
      {icerik}
    </Sayfa>
  );
}
