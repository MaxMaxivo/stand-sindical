(function attachShows(global) {
  const sourceUrl = "https://zambayonny.com/#shows";
  const plazaTickets = "https://www.plateanet.com/obra/34485?obra=ZAMBAYONNY---HUMOR-CANCIONES-Y-MONOLOGOS&paso=inicio";
  const alimme = [
    ["2026-10-15", "Los años locos", "1999622454590", "los-anos-locos"],
    ["2026-10-22", "Hotel de canciones en Orsai", "1999624349257", "hotel-de-canciones-y-canciones-en-orsai"],
    ["2026-10-29", "12 Maneras de vencer la realidad", "1999623331212", "12-maneras-de-vencer-la-realidad"],
    ["2026-11-05", "Inéditas del Cofre", "1999625258978", "ineditas-del-cofre"],
    ["2026-11-12", "El mejor de los mundos posibles", "1999625780538", "el-mejor-de-los-mundos-posibles"],
  ];

  global.STAND_SHOWS_META = { sourceUrl, checkedAt: "2026-10-10", timezone: "America/Argentina/Buenos_Aires" };
  global.STAND_SHOWS = [
    ...[10, 17, 24, 31].map((day) => ({
      id: `2026-10-${day}-orsai`, date: `2026-10-${day}`, time: "20:00",
      title: "Salvando las distancias", city: "Buenos Aires", venue: "Sala Orsai · Paseo La Plaza",
      ticketsUrl: plazaTickets, sourceUrl, dateStatus: "published",
    })),
    ...alimme.map(([date, title, ticketId, slug]) => ({
      id: `${date}-alimme`, date, time: "21:00", title, city: "Buenos Aires", venue: "Alimmé",
      ticketsUrl: `https://www.eventbrite.com.ar/e/${slug}-tickets-${ticketId}?aff=odcleoeventsincollection`,
      sourceUrl, dateStatus: "published",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).concat(
    [9, 16, 23, 30].map((day) => ({
      id: `enero-${day}-ogham`, date: null, publishedDay: day, publishedMonth: 1, time: "21:00",
      title: "Concierto acústico", city: "Mar del Plata", venue: "Ogham Diagonal",
      ticketsUrl: "https://articket.com.ar/ZAMBAYONNY-CICLO-VERANO/", sourceUrl,
      dateStatus: "year-unconfirmed", note: "El sitio publica día y mes, pero no explicita el año de estas fechas.",
    }))
  );
})(typeof window !== "undefined" ? window : globalThis);
