import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { tl, tarihMetni } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Bos, Kpi, KpiSatiri, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Hakediş' };

/** Okul yönetimi: kitabevi açtıysa ciro, hakediş oranı ve tutarı */
export default async function OkulHakedis() {
  const o = await oturumAl();
  if (!o || o.rol !== 'okul' || !o.okulId) redirect('/giris');
  const h = await (await ticaretRepo()).hakedisDurumu(o.okulId);
  return (
    <>
      <UstCubuk rol="okul" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik="Ciro ve hakediş" alt="Bu sezon okulunuz üzerinden yapılan ödenmiş satışlar (KDV dahil, teslimat hariç; iptal ve iadeler düşülür)." />
        {h.goster ? (
          <>
            <KpiSatiri>
              <Kpi ad="Sezon cirosu" deger={tl(h.ciro)} alt={`${h.siparis} sipariş`} />
              <Kpi ad="Hakediş oranı" deger={h.oran != null ? `%${h.oran}` : '—'} alt="Bugün geçerli oran" />
              <Kpi ad="Hakediş tutarı" deger={tl(h.hakedis)} alt="Sezon sonunda kesinleşir" />
            </KpiSatiri>
            <Bolum id="kosul" ust="KOŞULLAR" baslik="Hakediş koşulları">
              {h.tanimlar.length ? (
                <ul className="flex flex-col">
                  {h.tanimlar.map((t) => (
                    <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
                      <span><strong>%{t.oran}</strong> · {[t.veli && 'veli satışları', t.toplu && 'okulun toplu alımı'].filter(Boolean).join(' + ')}{t.aciklama ? ` · ${t.aciklama}` : ''}</span>
                      <span className="text-metin-2">{tarihMetni(t.baslangic)} – {t.bitis ? tarihMetni(t.bitis) : 'devam ediyor'}</span>
                    </li>
                  ))}
                </ul>
              ) : <Bos>Tanımlı koşul yok.</Bos>}
            </Bolum>
          </>
        ) : <div className="kart"><Bos>Hakediş bilgisi henüz paylaşılmadı. Ayrıntı için Kardelen Kitabevi ile görüşebilirsiniz.</Bos></div>}
      </Sayfa>
    </>
  );
}
