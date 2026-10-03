// Resultados de torneo (start.gg → torneos/<id>.json, generado con scripts/startgg-to-json.py).
// Se monta en cualquier elemento con data-results="torneos/md1.json".
(() => {
  const CHARS = {
    "dr-mario": "Dr. Mario", mario: "Mario", luigi: "Luigi", bowser: "Bowser", peach: "Peach", yoshi: "Yoshi",
    "donkey-kong": "Donkey Kong", "captain-falcon": "Captain Falcon", ganondorf: "Ganondorf", falco: "Falco",
    fox: "Fox", ness: "Ness", "ice-climbers": "Ice Climbers", kirby: "Kirby", samus: "Samus", zelda: "Zelda",
    sheik: "Sheik", link: "Link", "young-link": "Young Link", pichu: "Pichu", pikachu: "Pikachu",
    jigglypuff: "Jigglypuff", mewtwo: "Mewtwo", "mr-game-and-watch": "Mr. Game & Watch", marth: "Marth", roy: "Roy",
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const charName = (c) => CHARS[c] || c;
  const ordinal = (n) => `${n}º`;

  // Icono de stock del personaje (public/stocks/<slug>.png, sacados de start.gg).
  function portrait(c, size = "md") {
    if (!c) return `<span class="rs-char rs-${size} rs-empty" title="Sin personaje reportado"><img src="stocks/random-character.png" alt="" /></span>`;
    return `<img class="rs-char rs-${size}" src="stocks/${esc(c)}.png" alt="${esc(charName(c))}" title="${esc(charName(c))}" loading="lazy" width="32" height="32" />`;
  }

  const label = (e) => e.team || e.players[0].tag;
  const prefix = (e) => (!e.team && e.players[0].prefix ? e.players[0].prefix : "");
  const members = (e) => (e.team ? e.players.map((p) => p.tag).join(" & ") : "");

  function nameHTML(e) {
    const pre = prefix(e);
    return `${pre ? `<small class="rs-pre">${esc(pre)} |</small> ` : ""}<b>${esc(label(e))}</b>${e.team ? `<small class="rs-members">${esc(members(e))}</small>` : ""}`;
  }

  function podium(ev, byId) {
    const top = ev.standings.filter((e) => e.placement <= 3).slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    return `<div class="rs-podium">${order.map((e) => {
      const champ = e.placement === 1;
      const badges = [];
      if (champ) badges.push("Campeón");
      if (champ && e.losses === 0) badges.push("Invicto");
      const gf = ev.sets.find((s) => s.round === "Grand Final");
      if (champ && gf) {
        const opp = byId[gf.a === e.id ? gf.b : gf.a];
        const [me, them] = gf.a === e.id ? [gf.sa, gf.sb] : [gf.sb, gf.sa];
        badges.push(`Final ${me}-${them} vs ${label(opp)}`);
      }
      return `<div class="rs-step rs-p${e.placement}">
        ${champ ? `<span class="rs-crown" aria-hidden="true"></span>` : ""}
        ${portrait(e.chars[0], "xl")}
        <p class="rs-place">${ordinal(e.placement)}</p>
        <p class="rs-name">${nameHTML(e)}</p>
        <p class="rs-rec">${e.wins}-${e.losses} en sets${e.chars[0] ? ` · ${esc(charName(e.chars[0]))}` : ""}</p>
        ${badges.length ? `<p class="rs-badges">${badges.map((b) => `<span>${esc(b)}</span>`).join("")}</p>` : ""}
        <span class="rs-block" aria-hidden="true">${e.placement}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function setsFor(ev, e, byId) {
    const mine = ev.sets.filter((s) => s.a === e.id || s.b === e.id)
      .sort((x, y) => Math.abs(x.r) - Math.abs(y.r) || (x.r < 0) - (y.r < 0));
    return mine.map((s) => {
      const won = s.w === e.id;
      const oppId = s.a === e.id ? s.b : s.a;
      const opp = byId[oppId];
      const [me, them] = s.a === e.id ? [s.sa, s.sb] : [s.sb, s.sa];
      const games = s.games.map((g) => {
        const mc = (g.chars[e.id] || [])[0], oc = (g.chars[oppId] || [])[0];
        return `<span class="rs-game ${g.w === e.id ? "w" : "l"}" title="${esc(g.stage || "")}">${portrait(mc, "xs")}<i>vs</i>${portrait(oc, "xs")}</span>`;
      }).join("");
      const score = me == null || them == null || me < 0 || them < 0 ? (won ? "W" : "L") : `${me}-${them}`;
      return `<li class="${won ? "win" : "loss"}">
        <span class="rs-wl">${won ? "Ganó" : "Perdió"}</span>
        <span class="rs-round">${esc(s.round)}</span>
        <span class="rs-vs">vs ${portrait(opp.chars[0], "sm")} <b>${esc(label(opp))}</b> <em>${ordinal(opp.placement)}</em></span>
        <span class="rs-score">${score}</span>
        ${games ? `<span class="rs-games">${games}</span>` : ""}
      </li>`;
    }).join("");
  }

  function table(ev, byId) {
    return `<ol class="rs-table">${ev.standings.map((e) => `
      <li class="rs-row">
        <button type="button" class="rs-head" aria-expanded="false">
          <span class="rs-pl">${ordinal(e.placement)}</span>
          <span class="rs-chars">${(e.chars.length ? e.chars : [null]).map((c) => portrait(c, "sm")).join("")}</span>
          <span class="rs-who">${nameHTML(e)}</span>
          <span class="rs-wlrec"><b>${e.wins}</b>-<b>${e.losses}</b></span>
          <span class="rs-more" aria-hidden="true">▸</span>
        </button>
        <ul class="rs-sets" hidden>${setsFor(ev, e, byId)}</ul>
      </li>`).join("")}</ol>`;
  }

  function bracket(ev, byId) {
    const side = (pred, title) => {
      const rounds = [...new Set(ev.sets.filter(pred).map((s) => s.r))].sort((a, b) => Math.abs(a) - Math.abs(b));
      if (!rounds.length) return "";
      return `<div class="rs-side"><p class="rs-side-t">${title}</p><div class="rs-cols">${rounds.map((r) => {
        const sets = ev.sets.filter((s) => s.r === r);
        return `<div class="rs-col"><p class="rs-col-t">${esc(sets[0].round)}</p>${sets.map((s) => {
          const dq = s.sa == null || s.sb == null || s.sa < 0 || s.sb < 0;
          const row = (id, sc) => `<span class="${s.w === id ? "w" : ""}">${portrait(byId[id].chars[0], "xs")}<b>${esc(label(byId[id]))}</b><em>${dq ? (s.w === id ? "W" : "L") : sc}</em></span>`;
          return `<div class="rs-match">${row(s.a, s.sa)}${row(s.b, s.sb)}</div>`;
        }).join("")}</div>`;
      }).join("")}</div></div>`;
    };
    return side((s) => s.r > 0, "Winners") + side((s) => s.r < 0, "Losers");
  }

  async function mount(root) {
    let data;
    try {
      data = await (await fetch(root.dataset.results)).json();
    } catch {
      root.innerHTML = `<p class="rs-err">No se pudieron cargar los resultados.</p>`;
      return;
    }
    const date = data.startAt ? new Date(data.startAt * 1000).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santo_Domingo" }) : "";
    root.innerHTML = `
      <div class="rs-top">
        <div><p class="rs-kicker">${esc(date)}</p><h3 class="rs-title">${esc(data.name)}</h3></div>
        <a class="rs-link" href="${esc(data.url)}" target="_blank" rel="noopener">Ver en start.gg →</a>
      </div>
      <div class="rs-tabs" role="tablist">${data.events.map((ev, i) => `<button role="tab" type="button" aria-selected="${i === 0}" data-i="${i}">${esc(ev.name.replace(/^Melee\s+/i, ""))} <small>${ev.entrants}</small></button>`).join("")}</div>
      <div class="rs-body"></div>`;
    const body = root.querySelector(".rs-body");
    const show = (i) => {
      const ev = data.events[i];
      const byId = Object.fromEntries(ev.standings.map((e) => [e.id, e]));
      body.innerHTML = `${podium(ev, byId)}
        <div class="rs-views" role="tablist">
          <button type="button" aria-selected="true" data-v="table">Posiciones</button>
          <button type="button" aria-selected="false" data-v="bracket">Bracket</button>
        </div>
        <div class="rs-view" data-v="table">${table(ev, byId)}<p class="rs-hint">Toca un jugador para ver a quién le ganó y contra quién perdió.</p></div>
        <div class="rs-view rs-bracket" data-v="bracket" hidden>${bracket(ev, byId)}</div>`;
      root.querySelectorAll(".rs-tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.i == i));
    };
    root.addEventListener("click", (ev) => {
      const tab = ev.target.closest(".rs-tabs button");
      if (tab) return show(+tab.dataset.i);
      const v = ev.target.closest(".rs-views button");
      if (v) {
        root.querySelectorAll(".rs-views button").forEach((b) => b.setAttribute("aria-selected", b === v));
        root.querySelectorAll(".rs-view").forEach((x) => (x.hidden = x.dataset.v !== v.dataset.v));
        return;
      }
      const head = ev.target.closest(".rs-head");
      if (head) {
        const open = head.getAttribute("aria-expanded") === "true";
        head.setAttribute("aria-expanded", !open);
        head.nextElementSibling.hidden = open;
      }
    });
    show(0);
  }

  document.querySelectorAll("[data-results]").forEach(mount);
})();
