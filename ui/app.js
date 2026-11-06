(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const file = $("#file"), input = $("#input"), progress = $("#progress");
  const hint = $("#hint"), stats = $("#stats"), links = $("#links"), stage = $("#stage");
  const pages = [...document.querySelectorAll(".page")];
  const BLOCKS = 16;
  let busy = false;

  /* ---------- input ---------- */
  $("#browse").addEventListener("click", () => input.click());
  $("#sample").addEventListener("click", () => run(window.SAMPLE_CSV, "sample.csv"));
  $("#reset").addEventListener("click", reset);
  file.addEventListener("click", () => { if (!document.body.classList.contains("results")) input.click(); });
  file.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !document.body.classList.contains("results")) { e.preventDefault(); input.click(); } });
  input.addEventListener("change", () => { if (input.files[0]) readFile(input.files[0]); input.value = ""; });

  ["dragenter", "dragover"].forEach((t) => document.addEventListener(t, (e) => {
    e.preventDefault();
    if (!busy && !document.body.classList.contains("results")) file.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach((t) => document.addEventListener(t, (e) => {
    e.preventDefault();
    if (t === "dragleave" && e.relatedTarget) return;
    file.classList.remove("drag");
  }));
  document.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f && !busy && !document.body.classList.contains("results")) readFile(f);
  });

  function readFile(f) {
    const r = new FileReader();
    r.onload = () => run(String(r.result), f.name);
    r.readAsText(f);
  }

  /* ---------- parsing ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
    return rows;
  }

  function toTweets(text, name) {
    const isCSV = /\.csv$/i.test(name) || /^\s*(id,|.*,text)/i.test(text.split(/\r?\n/)[0]);
    if (!isCSV) {
      return text.split(/\r?\n/).map((t) => t.trim()).filter(Boolean).map((t, i) => ({ id: i + 1, text: t }));
    }
    const rows = parseCSV(text);
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const hasHeader = head.includes("text");
    const col = (n) => head.indexOf(n);
    const ti = hasHeader ? col("text") : rows[0].length - 1;
    return rows.slice(hasHeader ? 1 : 0).map((r, i) => ({
      id: hasHeader && col("id") >= 0 ? r[col("id")] : i + 1,
      keyword: hasHeader && col("keyword") >= 0 ? decodeURIComponent((r[col("keyword")] || "").replace(/%20/g, " ")) : "",
      location: hasHeader && col("location") >= 0 ? r[col("location")] : "",
      target: hasHeader && col("target") >= 0 && r[col("target")] !== "" ? Number(r[col("target")]) : null,
      text: (r[ti] || "").trim(),
    })).filter((t) => t.text);
  }

  /* ---------- main flow ---------- */
  function run(text, name) {
    if (busy) return;
    const tweets = toTweets(text, name);
    if (!tweets.length) { hint.innerHTML = "No tweets found in <b>" + esc(name) + "</b>. Try again"; return; }
    busy = true;

    const results = tweets.map((t) => Object.assign(t, PseudoModel.predict(t.text)));
    renderPages(results);
    renderStats(results, name);

    // 1. processing: shake + pixel progress bar
    file.classList.add("busy");
    hint.textContent = "Reading " + name + "…";
    progress.innerHTML = "<b></b>".repeat(BLOCKS);
    progress.classList.add("show");
    const blocks = [...progress.children];
    let n = 0;
    const tick = setInterval(() => {
      if (n < BLOCKS) blocks[n++].classList.add("on");
      else {
        clearInterval(tick);
        openFile();
      }
    }, 70);
  }

  function openFile() {
    // 2. open the folder, papers rise out
    file.classList.remove("busy");
    file.classList.add("open");
    setTimeout(launchPages, 650);
  }

  function launchPages() {
    // 3. reveal page grid, fly each page out from the folder
    document.body.classList.add("results");
    file.classList.add("launched");
    requestAnimationFrame(() => {
      const fr = file.getBoundingClientRect();
      const fx = fr.left + fr.width / 2, fy = fr.top + fr.height * 0.55;
      pages.forEach((p) => {
        const r = p.getBoundingClientRect();
        p.classList.remove("flying");
        p.style.opacity = "0";
        p.style.transform = `translate(${fx - (r.left + r.width / 2)}px, ${fy - r.top}px) scale(0.08)`;
      });
      void stage.offsetWidth; // flush
      pages.forEach((p, i) => {
        setTimeout(() => {
          p.classList.add("flying");
          p.style.opacity = "1";
          p.style.transform = "none";
        }, 60 + i * 140);
      });
      setTimeout(() => {
        pages.forEach((p) => { p.classList.remove("flying"); p.style.transform = ""; p.style.opacity = ""; });
        document.body.classList.add("landed");
        drawLinks();
        links.classList.add("show");
        busy = false;
      }, 60 + 2 * 140 + 760);
    });
  }

  /* ---------- dotted arrows ---------- */
  function drawLinks() {
    links.querySelectorAll(":scope > path").forEach((p) => p.remove());
    if (!document.body.classList.contains("landed")) return;
    const sr = stage.getBoundingClientRect();
    const fr = file.getBoundingClientRect();
    const narrow = window.matchMedia("(max-width: 860px)").matches;
    const sy = fr.bottom - sr.top + 6;
    const cx = fr.left + fr.width / 2 - sr.left;
    pages.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      let d;
      if (narrow) {
        // stacked layout: one straight line down to the first page
        if (i > 0) return;
        d = `M${cx} ${sy} V${r.top - sr.top - 14}`;
      } else {
        const sx = cx + (i - 1) * 36;
        const ex = r.left + r.width / 2 - sr.left;
        const ey = r.top - sr.top - 14;
        const my = (ey - sy) * 0.55;
        d = `M${sx} ${sy} C${sx} ${sy + my} ${ex} ${ey - my} ${ex} ${ey}`;
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("marker-end", "url(#head)");
      links.appendChild(path);
    });
  }
  new ResizeObserver(() => drawLinks()).observe(stage);

  /* ---------- rendering ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function tweetHTML(t) {
    const text = t.tokens.map((k) =>
      k.weight > 0 ? `<span class="pos" title="+${k.weight}">${esc(k.text)}</span>` :
      k.weight < 0 ? `<span class="neg" title="${k.weight}">${esc(k.text)}</span>` : esc(k.text)
    ).join("");
    const on = Math.round(t.prob * 10);
    const meter = Array.from({ length: 10 }, (_, i) => `<b class="${i < on ? "on" : ""}"></b>`).join("");
    const meta = [];
    meta.push(`<span class="meter" title="P(disaster)">${meter}</span><span class="prob">${t.prob.toFixed(2)}</span>`);
    if (t.keyword) meta.push(`<span class="tag">#${esc(t.keyword)}</span>`);
    if (t.location) meta.push(`<span>${esc(t.location)}</span>`);
    if (t.target === 0 || t.target === 1) {
      const pred = t.label === "disaster" ? 1 : t.label === "safe" ? 0 : null;
      if (pred !== null) meta.push(pred === t.target ? `<span class="tag ok">✓ label ${t.target}</span>` : `<span class="tag bad">✗ label ${t.target}</span>`);
      else meta.push(`<span class="tag">label ${t.target}</span>`);
    }
    return `<li><p class="tweet-text">${text}</p><div class="tweet-meta">${meta.join("")}</div></li>`;
  }

  function renderPages(results) {
    const groups = { disaster: [], uncertain: [], safe: [] };
    results.forEach((r) => groups[r.label].push(r));
    groups.disaster.sort((a, b) => b.prob - a.prob);
    groups.safe.sort((a, b) => a.prob - b.prob);
    groups.uncertain.sort((a, b) => Math.abs(a.prob - 0.5) - Math.abs(b.prob - 0.5));
    pages.forEach((p) => {
      const g = groups[p.dataset.cat];
      $(".count", p).textContent = g.length;
      $(".tweets", p).innerHTML = g.length ? g.map(tweetHTML).join("") : `<li class="empty">Nothing here</li>`;
      $(".tweets", p).scrollTop = 0;
    });
  }

  function renderStats(results, name) {
    const labelled = results.filter((r) => r.target === 0 || r.target === 1);
    const decided = labelled.filter((r) => r.label !== "uncertain");
    const correct = decided.filter((r) => (r.label === "disaster" ? 1 : 0) === r.target).length;
    const parts = [`<span>${esc(name)}</span>`, `<span>${results.length} tweets</span>`];
    if (decided.length) parts.push(`<span>accuracy ${Math.round((correct / decided.length) * 100)}% <small>(${decided.length} decided)</small></span>`);
    else parts.push(`<span class="muted">no labels in file</span>`);
    stats.innerHTML = parts.join("");
  }

  function reset() {
    document.body.classList.remove("results", "landed");
    links.classList.remove("show");
    links.querySelectorAll(":scope > path").forEach((p) => p.remove());
    file.classList.remove("open", "launched", "busy");
    progress.classList.remove("show");
    progress.innerHTML = "";
    hint.innerHTML = "Drop a <b>.csv</b> or <b>.txt</b> file on the folder";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
})();
