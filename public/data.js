// Contenido editable del sitio. Solo datos reales: no inventar jugadores, resultados ni fechas.

window.MD = {
  // Clips en las teles del lounge (id = id de YouTube). "tv": big = tele central, left/right = teles laterales.
  clips: [
    { id: "7e_brJEn86M", tag: "Set completo · FT10", title: "NotMe (Falcon) vs Aloric (Marth)", tv: "big", video: "media/crt-loop.mp4", poster: "media/crt-loop.jpg" },
    { id: "lqvQscgJ4Js", tag: "Short · Leyendas", title: "PPMD is STILL disgusting in 2026", tv: "left" },
    { id: "_bRrK4uKSvo", tag: "Short · Money match", title: "A po' Lein la tiene??", tv: "right" },
  ],

  // Jugadores (de los que hay footage). main/char/color solo si se sabe:
  // char = clave de start.gg (ver STOCK en standings.js), color = índice de costume en ese mapa (0 = default).
  // Los mains y colores de abajo salen de torneos/md1.json (replays .slp cruzados con start.gg).
  players: [
    { name: "NotMe", aka: "FireKeeper", country: "RD", main: "Captain Falcon", char: "captain-falcon", color: 1 },
    { name: "Zuraco", country: "RD", main: "Falco", char: "falco", color: 3 },
    { name: "Halloween", country: "RD" },
    { name: "Dolfry", aka: "Ishigami", country: "RD", main: "Marth", char: "marth", color: 1 },
    { name: "SourceCode", aka: "Dpl-Negan", country: "RD" },
    { name: "KazaGarrouns", country: "RD", main: "Falco", char: "falco", color: 2 },
    { name: "PikaRD", country: "RD" },
    { name: "Ears", country: "PR", main: "Peach", char: "peach", color: 0 },
    { name: "Kot", aka: "Ayatollah", country: "PR", main: "Jigglypuff", char: "jigglypuff", color: 0 },
  ],

  // Torneos con resultados publicados (para cruzar el roster con sus puestos)
  tournaments: [{ id: "md1", short: "MD #1", json: "torneos/md1.json" }],
};
