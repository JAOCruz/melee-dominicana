// Envíos de la comunidad (clips, sets, streams) vía Netlify Forms.
// Sin JS el formulario se envía normal y Netlify redirige a /enviado.html.
(() => {
  const form = document.querySelector('form[name="envios"]');
  if (!form) return;
  const status = form.querySelector(".sb-status");
  const link = form.elements.link;
  const file = form.elements.replay;
  const MAX = 8 * 1024 * 1024; // límite de Netlify Forms por envío
  form.noValidate = true; // con JS validamos nosotros (mensajes en español); sin JS queda la validación nativa

  const tipo = () => form.elements.tipo.value;
  const sync = () => {
    const t = tipo();
    form.querySelectorAll("[data-show]").forEach((el) => {
      const on = el.dataset.show.split(" ").includes(t);
      el.hidden = !on;
      el.querySelectorAll("input, textarea").forEach((i) => (i.disabled = !on));
    });
    link.placeholder = t === "stream" ? "https://twitch.tv/tu-canal" : "https://";
  };
  form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener("change", sync));
  sync();

  const say = (msg, kind = "") => { status.textContent = msg; status.dataset.kind = kind; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = tipo();
    const f = file && !file.disabled && file.files[0];
    if (t === "stream" && !link.value) { say("Pon el link de tu canal.", "err"); link.focus(); return; }
    if (t !== "stream" && !link.value && !f) { say("Pon un link o sube el replay .slp.", "err"); link.focus(); return; }
    if (f && !/\.slp$/i.test(f.name)) { say("El replay tiene que ser un archivo .slp.", "err"); return; }
    if (f && f.size > MAX) { say("El replay pasa de 8 MB. Mándalo por link (Drive, Dropbox…).", "err"); return; }
    say("");
    if (!form.reportValidity()) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    say("Enviando…");
    try {
      const res = await fetch("/", { method: "POST", body: new FormData(form) });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      sync();
      say("¡Recibido! Lo revisamos y te avisamos si sale en el canal. GG.", "ok");
    } catch {
      say("No se pudo enviar. Intenta otra vez en un rato.", "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
