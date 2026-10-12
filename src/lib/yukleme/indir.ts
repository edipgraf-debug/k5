/** Excel dosyası yanıtı (Türkçe dosya adıyla) */
export function excelYaniti(icerik: Buffer, ad: string) {
  const ascii = ad.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^A-Za-z0-9._-]/g, '_');
  return new Response(new Uint8Array(icerik), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(ad)}`,
      'Cache-Control': 'no-store',
    },
  });
}
