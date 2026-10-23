#!/usr/bin/env bash
# Publica un artículo: lo copia a content/noticias/, regenera, commit y push a la rama actual.
# Uso: scripts/publish-news.sh ruta/articulo.md
# No interactivo; usa las credenciales de git ya configuradas en la máquina (nunca tokens en el repo).
set -euo pipefail
[ $# -eq 1 ] && [ -f "$1" ] || { echo "Uso: $0 <articulo.md>" >&2; exit 2; }
cd "$(dirname "$0")/.."
SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
DEST="content/noticias/$(basename "$1")"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" != "HEAD" ] || { echo "HEAD desacoplado; abortando." >&2; exit 1; }
[ "$SRC" = "$(pwd)/$DEST" ] || cp "$SRC" "$DEST"
python3 scripts/build-noticias.py
git add "$DEST" public/noticias public/sitemap.xml public/robots.txt
if git diff --cached --quiet; then echo "Sin cambios que publicar."; exit 0; fi
TITLE="$(sed -n 's/^title: *//p' "$DEST" | head -1)"
git commit -q -m "Noticias: ${TITLE:-$(basename "$1")}"
GIT_TERMINAL_PROMPT=0 git push origin "$BRANCH"
echo "Publicado en la rama $BRANCH."
