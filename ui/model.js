/*
 * Pseudo model — a stand-in until the real classifier is trained.
 * Interface the UI depends on:
 *   PseudoModel.predict(text) -> { prob: 0..1, label: "disaster"|"uncertain"|"safe", tokens: [{ text, weight }] }
 * Replace the internals (e.g. call a Python API) and keep this shape.
 */
(function () {
  const WEIGHTS = {
    // pushes toward "real disaster"
    earthquake: 2.8, quake: 2.2, magnitude: 2.2, tsunami: 2.8, wildfire: 2.8, wildfires: 2.8,
    bushfire: 2.6, fire: 1.6, fires: 1.8, flames: 1.4, burning: 1.2, smoke: 1.2,
    flood: 2.4, floods: 2.4, flooding: 2.4, flooded: 2.2, hurricane: 2.6, typhoon: 2.6,
    cyclone: 2.6, tornado: 2.4, storm: 1.4, landslide: 2.6, mudslide: 2.6, avalanche: 2.0,
    volcano: 2.2, eruption: 2.2, drought: 2.0, heatwave: 1.8, outbreak: 1.6,
    evacuate: 2.4, evacuated: 2.4, evacuation: 2.6, evacuating: 2.4, rescue: 1.6, rescued: 1.8,
    killed: 2.2, dead: 1.6, death: 1.4, deaths: 1.8, casualties: 2.4, injured: 1.8, injuries: 1.8,
    victims: 1.8, survivors: 1.6, missing: 1.2, toll: 1.6,
    explosion: 2.2, exploded: 1.8, blast: 1.6, bomb: 1.4, bombing: 2.0, attack: 1.2,
    crash: 1.4, crashed: 1.4, derailment: 2.6, derailed: 2.6, collapse: 1.8, collapsed: 1.8,
    debris: 1.6, destroyed: 1.6, damage: 1.2, wreckage: 2.0, accident: 1.4, emergency: 1.6,
    sirens: 1.2, firefighters: 2.0, authorities: 1.4, police: 0.8, officials: 1.2,
    breaking: 1.2, news: 0.8, warning: 1.2, alert: 1.2, displaced: 2.0, shelter: 1.0,
    // pushes toward "not a disaster"
    lol: -2.0, lmao: -2.0, haha: -1.8, omg: -0.8, love: -1.4, lovely: -1.4, amazing: -1.4,
    awesome: -1.4, fun: -1.4, best: -1.0, cute: -1.6, song: -1.6, songs: -1.6, album: -1.6,
    mixtape: -2.0, movie: -1.4, film: -1.0, show: -0.8, game: -1.0, video: -0.8, party: -1.2,
    lit: -1.2, tonight: -0.6, weekend: -0.8, birthday: -1.6, dinner: -1.0, pizza: -1.6,
    like: -0.6, feel: -0.6, feeling: -0.6, literally: -1.0, totally: -1.0, so: -0.3,
    my: -0.4, me: -0.3, i: -0.3, im: -0.4, you: -0.4, u: -0.6, ur: -0.8,
    hot: -0.4, killing: -0.8, kill: -0.4, blew: -0.6, dying: -0.8, dead_inside: -1.6,
    exam: -1.2, homework: -1.4, boss: -0.6, traffic: -0.4, monday: -1.0, coffee: -1.2,
  };
  const BIAS = -0.5;
  const UPPER = 0.65, LOWER = 0.35;

  const norm = (w) => w.toLowerCase().replace(/^#|^@/, "").replace(/[^a-z0-9_']/g, "").replace(/'/g, "");

  // tiny deterministic jitter so unseen tweets don't all land on the same score
  function jitter(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (((h >>> 0) % 1000) / 1000 - 0.5) * 0.6; // ±0.3 logit
  }

  function predict(text) {
    const parts = String(text).split(/(\s+)/);
    let logit = BIAS + jitter(text);
    const tokens = parts.map((p) => {
      if (/^\s+$/.test(p) || p === "") return { text: p, weight: 0 };
      if (/^https?:\/\//i.test(p)) { logit += 0.4; return { text: p, weight: 0 }; }
      const w = WEIGHTS[norm(p)] || 0;
      logit += w;
      return { text: p, weight: w };
    });
    const prob = 1 / (1 + Math.exp(-logit));
    const label = prob >= UPPER ? "disaster" : prob <= LOWER ? "safe" : "uncertain";
    return { prob, label, tokens };
  }

  window.PseudoModel = { predict, UPPER, LOWER };
})();
