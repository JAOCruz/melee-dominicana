# Melee Dominicana — sitio

Sitio estático (sin build). Todo lo publicable está en `public/`.

- Contenido editable (clips del lounge, jugadores, enlaces del hub): `public/data.js`
- Local: `cd public && python3 -m http.server 8765` → http://localhost:8765
- Netlify: proyecto `melee-dominicana-249`, deploy automático desde `main` (publish `public`, sin comando de build; ver `netlify.toml`).
- `_anterior/` (ignorado por git): copia de referencia de la versión vieja que estaba en vivo.
