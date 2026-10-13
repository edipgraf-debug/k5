import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { listeErisimi, ogrenciErisimi } from '@/lib/listeler';
import { epostaMaske, hedefMetni, sepetDurumu, tarihSaat, telMaske } from '@/lib/bicim';
import type { Rol } from '@/lib/types';
import UstCubuk from '@/components/UstCubuk';
import { BildirimRozeti, Bolum, Bos, Rozet, Sayfa, SayfaBasligi, SepetRozeti, TABLO } from './Ortak';
import OgrenciyeYayinla from './OgrenciyeYayinla';

type PersonelRol = Exclude<Rol, 'veli'>;

/** /{ogretmen|okul|yonetim}/ogrenciler/{id}: öğrenci detayı, açık sepetler, bildirim geçmişi */
export default async function OgrenciDetaySayfasi({ rol, id, ust }: { rol: PersonelRol; id: number; ust?: React.ReactNode }) {
  const o = await oturumAl();
  if (!o || o.rol !== rol) redirect('/giris');
  if (!Number.isInteger(id) || id <= 0) notFound();
  const r = await repo();
  const ogr = await r.ogrenci(id);
  if (!ogr || !(await ogrenciErisimi(o, ogr))) notFound();
  const rolOnek = `/${rol}`;

  const [veliler, bildirimler, tumListeler] = await Promise.all([r.ogrenciVelileri(ogr.id), r.ogrenciBildirimleri(ogr.id), r.okulListeleri(ogr.okulId)]);
  const sepetler = [];
  for (const l of tumListeler) {
    if (!(await listeErisimi(o, l))) continue;
    const t = (await r.listeTakip(l.id)).find((x) => x.ogrenciId === ogr.id);
    if (t) sepetler.push({ liste: l, takip: t });
  }

  return (
    <>
      <UstCubuk rol={rol} ad={o.ad} aktif={rolOnek} />
      <Sayfa>
        <SayfaBasligi geri={{ href: rol === 'yonetim' ? `/yonetim/okullar/${ogr.okulId}` : rolOnek, ad: rol === 'yonetim' ? ogr.okulAd : 'Ana sayfa' }}
          baslik={`${ogr.ad} ${ogr.soyad}`} alt={`${ogr.okulAd} · ${ogr.sinifSube} · Okul no ${ogr.okulNo}`} />
        {ust}

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <Bolum id="sepetler" ust="TAVSİYE SEPETLERİ" baslik="Öğrencinin sınıfındaki sepetler">
              {sepetler.length ? (
                <ul className="flex flex-col">
                  {sepetler.map(({ liste, takip }) => (
                    <li key={liste.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-4">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`${rolOnek}/listeler/${liste.id}`} className="font-baslik font-extrabold">{liste.ad}</Link>
                          <SepetRozeti durum={sepetDurumu(liste)} />
                        </div>
                        <span className="text-[13px] text-metin-3">
                          {liste.kapsamAd} · {liste.satirlar.length} kitap · {hedefMetni(liste)} · {takip.acildi ? `veli ${tarihSaat(takip.acildi)} tarihinde açtı` : 'veli henüz açmadı'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {takip.gorebilir ? <Rozet ton="yesil">Bu öğrenciye açık</Rozet> : <Rozet>Bu öğrenciye kapalı</Rozet>}
                        {!takip.gorebilir && liste.satirlar.length > 0 && <OgrenciyeYayinla listeId={liste.id} ogrenciId={ogr.id} tur="yayinla" />}
                        {takip.gorebilir && veliler.length > 0 && <OgrenciyeYayinla listeId={liste.id} ogrenciId={ogr.id} tur="hatirlat" />}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <Bos>Bu öğrencinin sınıfı için henüz sepet yok.</Bos>}
            </Bolum>

            <Bolum id="bildirimler" ust="GEÇMİŞ" baslik="Bildirim geçmişi">
              {bildirimler.length ? (
                <div className={TABLO.sar}>
                  <table className={TABLO.tablo}>
                    <thead><tr>
                      <th scope="col" className={TABLO.th}>Tarih</th><th scope="col" className={TABLO.th}>Sepet</th>
                      <th scope="col" className={TABLO.th}>Kanal / durum</th><th scope="col" className={TABLO.th}>Alıcı</th>
                    </tr></thead>
                    <tbody>
                      {bildirimler.map((b) => (
                        <tr key={b.id}>
                          <td className={TABLO.td}>{tarihSaat(b.tarih)}</td>
                          <td className={TABLO.td}>{b.listeAd ?? '—'}</td>
                          <td className={TABLO.td}><BildirimRozeti durum={b.durum} kanal={b.kanal === 'SMS' ? 'SMS' : 'E-posta'} /></td>
                          <td className={TABLO.td}>{b.kanal === 'SMS' ? telMaske(b.alici) : epostaMaske(b.alici)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Bos>Bu öğrencinin velisine henüz bildirim gönderilmedi.</Bos>}
            </Bolum>
          </div>

          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
            <Bolum id="veliler" ust="VELİ" baslik={veliler.length ? `${veliler.length} kayıtlı veli` : 'Kayıtlı veli yok'}>
              {veliler.length ? (
                <ul className="flex flex-col">
                  {veliler.map((v) => (
                    <li key={v.veliId} className="flex flex-col gap-0.5 border-b border-[#EEF0F3] px-6 py-3">
                      <span className="font-bold">{v.adSoyad ?? 'Ad girilmemiş'}</span>
                      <span className="text-sm text-metin-2">{telMaske(v.telefon)}</span>
                      <span className="text-sm text-metin-2">{v.eposta ? epostaMaske(v.eposta) : <span className="font-bold text-sari">E-posta yok · yalnız SMS alır</span>}</span>
                    </li>
                  ))}
                </ul>
              ) : <Bos>Veli eklenmeden bildirim gönderilemez. Veli bilgisi okulun Excel yüklemesiyle eklenir.</Bos>}
            </Bolum>
            <div className="flex flex-col gap-2 rounded-[18px] bg-lacivert p-5 text-white">
              <span className="font-baslik font-extrabold">Sipariş ve tedarik</span>
              <span className="text-sm leading-relaxed text-[#C9D1DC]">Öğrencinin siparişleri ve &quot;aldı / almadı&quot; durumu ödeme adımı tamamlanınca burada görünecek.</span>
            </div>
          </aside>
        </div>
      </Sayfa>
    </>
  );
}
