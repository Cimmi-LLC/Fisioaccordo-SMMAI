// Caption + hashtag senza doppioni (funzioni pure).
//
// Il modello a volte chiude caption_instagram con un blocco di hashtag anche
// quando gli stessi hashtag arrivano in hashtag_suggeriti: appendendo si
// otteneva la caption con il blocco ripetuto due volte (revisione 03/11).

/** Riga fatta SOLO di hashtag (e spazi): es. "#schiena #postura". */
function rigaDiSoliHashtag(riga: string): boolean {
  const t = riga.trim();
  if (!t) return false;
  const pezzi = t.split(/\s+/);
  return pezzi.length > 0 && pezzi.every((p) => /^#[\p{L}0-9_]+$/u.test(p));
}

/** Toglie dalla coda della caption le righe fatte solo di hashtag. */
export function senzaBloccoHashtag(caption: string): string {
  const righe = (caption || '').split('\n');
  let fine = righe.length;
  while (fine > 0) {
    const riga = righe[fine - 1].trim();
    if (riga === '' || rigaDiSoliHashtag(riga)) fine--;
    else break;
  }
  return righe.slice(0, fine).join('\n').trimEnd();
}

/** Caption pronta da pubblicare: testo pulito + un solo blocco di hashtag. */
export function captionConHashtag(caption: string, hashtag: string[] | null | undefined): string {
  const corpo = senzaBloccoHashtag(caption || '');
  const unici = Array.from(new Set(
    (hashtag || [])
      .map((h) => String(h).trim().replace(/^#/, ''))
      .filter(Boolean)
      .map((h) => '#' + h),
  ));
  if (unici.length === 0) return corpo;
  return [corpo, unici.join(' ')].filter(Boolean).join('\n\n');
}
