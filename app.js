(() => {
  "use strict";
  document.documentElement.classList.add("js");

  /* ---------- Outils mathématiques ---------- */
  const EPS = 1e-9;
  const zeros = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));
  const size = (M) => [M.length, M[0].length];
  const transpose = (M) => M[0].map((_, j) => M.map((row) => row[j]));
  const add = (A, B, s = 1) => A.map((row, i) => row.map((v, j) => v + s * B[i][j]));
  const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((acc, v, k) => acc + v * B[k][j], 0)));

  function det(M) {
    const n = M.length;
    const a = M.map((r) => r.slice());
    let d = 1;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < EPS) return 0;
      if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; d = -d; }
      d *= a[c][c];
      for (let r = c + 1; r < n; r++) {
        const f = a[r][c] / a[c][c];
        for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
      }
    }
    return d;
  }

  function rank(M) {
    const a = M.map((r) => r.slice());
    const [rows, cols] = size(a);
    let rk = 0;
    for (let c = 0; c < cols && rk < rows; c++) {
      let p = rk;
      for (let r = rk + 1; r < rows; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < EPS) continue;
      [a[p], a[rk]] = [a[rk], a[p]];
      for (let r = rk + 1; r < rows; r++) {
        const f = a[r][c] / a[rk][c];
        for (let k = c; k < cols; k++) a[r][k] -= f * a[rk][k];
      }
      rk++;
    }
    return rk;
  }

  // Affiche un nombre proprement : entier, fraction simple, ou décimal.
  function fmt(x) {
    if (typeof x === "string") return x;
    if (Math.abs(x) < EPS) return "0";
    const sign = x < 0 ? "−" : "";
    const v = Math.abs(x);
    if (Math.abs(v - Math.round(v)) < 1e-9) return sign + Math.round(v);
    for (let d = 2; d <= 100; d++) {
      const n = v * d;
      if (Math.abs(n - Math.round(n)) < 1e-7) return sign + Math.round(n) + "/" + d;
    }
    return sign + v.toFixed(3).replace(/\.?0+$/, "").replace(".", ",");
  }
  const dec = (x, n = 2) => (x < 0 ? "−" : "") + Math.abs(x).toFixed(n).replace(".", ",");

  /* ---------- Rendu des matrices ---------- */
  function renderMx(el, M, { diag = false } = {}) {
    el.innerHTML = "";
    el.style.gridTemplateColumns = `repeat(${M[0].length}, auto)`;
    M.forEach((row, i) =>
      row.forEach((v, j) => {
        const c = document.createElement("span");
        c.className = "cell";
        if (diag && i === j) c.classList.add("on-diag");
        c.dataset.i = i;
        c.dataset.j = j;
        c.textContent = fmt(v);
        el.appendChild(c);
      })
    );
    return el;
  }

  document.querySelectorAll(".mx[data-m]").forEach((el) => {
    renderMx(el, JSON.parse(el.dataset.m), { diag: el.classList.contains("diag") });
  });

  /* ---------- Éditeur de matrice ---------- */
  function createEditor(root, { rows = 2, cols = 2, init, fixed = false, max = 4, onChange }) {
    let data = init ? init.map((r) => r.slice()) : zeros(rows, cols);
    const name = root.dataset.name;
    root.innerHTML = `
      <div class="editor-head">
        <span class="editor-name">${name}</span>
        ${fixed ? "" : `
        <span class="size-ctl" aria-label="Taille de ${name}">
          <button type="button" data-d="r-" aria-label="Retirer une ligne">−</button>
          <span class="r"></span>
          <button type="button" data-d="r+" aria-label="Ajouter une ligne">+</button>
          ×
          <button type="button" data-d="c-" aria-label="Retirer une colonne">−</button>
          <span class="c"></span>
          <button type="button" data-d="c+" aria-label="Ajouter une colonne">+</button>
        </span>`}
      </div>
      <div class="mx inputs"></div>`;
    const grid = root.querySelector(".mx");

    function build() {
      const [r, c] = size(data);
      grid.innerHTML = "";
      grid.style.gridTemplateColumns = `repeat(${c}, auto)`;
      data.forEach((row, i) =>
        row.forEach((v, j) => {
          const inp = document.createElement("input");
          inp.type = "text";
          inp.inputMode = "decimal";
          inp.className = "cell";
          inp.value = String(v).replace(".", ",");
          inp.dataset.i = i;
          inp.dataset.j = j;
          inp.setAttribute("aria-label", `${name} ligne ${i + 1} colonne ${j + 1}`);
          grid.appendChild(inp);
        })
      );
      if (!fixed) {
        root.querySelector(".r").textContent = r;
        root.querySelector(".c").textContent = c;
        root.querySelector('[data-d="r-"]').disabled = r <= 1;
        root.querySelector('[data-d="c-"]').disabled = c <= 1;
        root.querySelector('[data-d="r+"]').disabled = r >= max;
        root.querySelector('[data-d="c+"]').disabled = c >= max;
      }
    }

    grid.addEventListener("input", (e) => {
      const inp = e.target;
      const raw = inp.value.trim().replace(",", ".").replace("−", "-");
      const v = raw === "" || raw === "-" ? NaN : Number(raw);
      inp.classList.toggle("invalid", !Number.isFinite(v));
      if (Number.isFinite(v)) data[inp.dataset.i][inp.dataset.j] = v;
      onChange && onChange();
    });

    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      const [r, c] = size(data);
      const d = b.dataset.d;
      if (d === "r+" && r < max) data.push(Array(c).fill(0));
      if (d === "r-" && r > 1) data.pop();
      if (d === "c+" && c < max) data.forEach((row) => row.push(0));
      if (d === "c-" && c > 1) data.forEach((row) => row.pop());
      build();
      onChange && onChange();
    });

    build();
    return {
      get: () => data,
      valid: () => !grid.querySelector(".invalid"),
      set(M) { data = M.map((r) => r.slice()); build(); onChange && onChange(); },
      cells: () => grid.querySelectorAll("input"),
    };
  }

  /* ---------- Hero animé ---------- */
  const hero = document.getElementById("hero-mx");
  if (hero) {
    hero.style.setProperty("--c", "var(--lilac)");
    renderMx(hero, [[3, 1, 4], [1, 5, 9], [2, 6, 5]]);
    const cells = hero.querySelectorAll(".cell");
    setInterval(() => {
      const c = cells[Math.floor(Math.random() * cells.length)];
      c.textContent = fmt(Math.floor(Math.random() * 19) - 9);
      c.classList.add("flash");
      setTimeout(() => c.classList.remove("flash"), 500);
    }, 1100);
  }

  /* ---------- 1. Explorer les coefficients ---------- */
  const ex = document.getElementById("explore-mx");
  const exOut = document.getElementById("explore-out");
  if (ex) {
    const show = (cell) => {
      ex.querySelectorAll(".cell").forEach((c) => {
        c.classList.toggle("hl", c === cell);
        c.classList.toggle("same", c !== cell && (c.dataset.i === cell.dataset.i || c.dataset.j === cell.dataset.j));
      });
      const i = +cell.dataset.i + 1, j = +cell.dataset.j + 1;
      exOut.innerHTML = `a<sub>${i}${j}</sub> = ${cell.textContent} &nbsp;→ ligne ${i}, colonne ${j}`;
    };
    ex.querySelectorAll(".cell").forEach((c) => {
      c.tabIndex = 0;
      c.addEventListener("mouseenter", () => show(c));
      c.addEventListener("focus", () => show(c));
      c.addEventListener("click", () => show(c));
    });
    ex.addEventListener("mouseleave", () => {
      ex.querySelectorAll(".cell").forEach((c) => c.classList.remove("hl", "same"));
      exOut.textContent = "Taille : 3 lignes et 4 colonnes";
    });
  }

  /* ---------- Repère SVG ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function drawAxes(svg) {
    svg.innerHTML = "";
    const defs = svgEl("defs", {});
    defs.innerHTML = `<marker id="${svg.id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#26232e"/></marker>`;
    svg.appendChild(defs);
    for (let k = -5; k <= 5; k++) {
      svg.appendChild(svgEl("line", { x1: k, y1: -6, x2: k, y2: 6, stroke: "rgba(38,35,46,.1)", "stroke-width": 0.04 }));
      svg.appendChild(svgEl("line", { x1: -6, y1: k, x2: 6, y2: k, stroke: "rgba(38,35,46,.1)", "stroke-width": 0.04 }));
    }
    svg.appendChild(svgEl("line", { x1: -6, y1: 0, x2: 6, y2: 0, stroke: "#77727f", "stroke-width": 0.06 }));
    svg.appendChild(svgEl("line", { x1: 0, y1: -6, x2: 0, y2: 6, stroke: "#77727f", "stroke-width": 0.06 }));
  }

  /* ---------- 2. Vecteur ---------- */
  const vx = document.getElementById("vx"), vy = document.getElementById("vy");
  const vecSvg = document.getElementById("vec-svg");
  function drawVec() {
    const x = +vx.value, y = +vy.value;
    document.getElementById("vx-o").textContent = x;
    document.getElementById("vy-o").textContent = y;
    drawAxes(vecSvg);
    if (x || y) {
      vecSvg.appendChild(svgEl("line", { x1: x, y1: 0, x2: x, y2: -y, stroke: "#b99be6", "stroke-width": 0.06, "stroke-dasharray": "0.2 0.15" }));
      vecSvg.appendChild(svgEl("line", { x1: 0, y1: 0, x2: x, y2: -y, stroke: "#26232e", "stroke-width": 0.16, "marker-end": `url(#vec-svg-arrow)` }));
    }
    vecSvg.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 0.14, fill: "#26232e" }));
    const n = Math.hypot(x, y);
    document.getElementById("vec-out").innerHTML =
      `Le vecteur va de ${fmt(x)} vers la droite et de ${fmt(y)} vers le haut. Sa longueur est environ ${dec(n)}.`;
  }
  if (vx) { vx.addEventListener("input", drawVec); vy.addEventListener("input", drawVec); drawVec(); }

  /* ---------- 4. Identité ---------- */
  const idMx = document.getElementById("id-mx");
  const idSeg = document.querySelector("#identite .seg");
  function drawId(n) {
    const sub = "₀₁₂₃₄₅"[n];
    document.getElementById("id-label").textContent = `I${sub} =`;
    renderMx(idMx, Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))), { diag: true });
  }
  if (idSeg) {
    idSeg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      idSeg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      drawId(+b.dataset.n);
    });
    drawId(3);
  }

  /* ---------- 5. Atelier opérations ---------- */
  const opsLab = document.getElementById("ops-lab");
  if (opsLab) {
    const [ea, eb] = opsLab.querySelectorAll(".editor");
    const result = document.getElementById("ops-result");
    const steps = document.getElementById("ops-steps");
    let op = "mul";
    const A = createEditor(ea, { init: [[1, 2, 0], [3, -1, 4]], onChange: compute });
    const B = createEditor(eb, { init: [[2, 1], [0, 3], [5, -2]], onChange: compute });

    const sym = { add: "A + B", sub: "A − B", mul: "A × B", bma: "B × A" };

    function clearHl() {
      [...A.cells(), ...B.cells()].forEach((c) => c.classList.remove("hl-row", "hl-col"));
    }

    function compute() {
      steps.innerHTML = "";
      clearHl();
      if (!A.valid() || !B.valid()) {
        result.innerHTML = `<div class="err"><strong>Une case contient une valeur invalide.</strong>Utilisez uniquement des nombres (ex. 3, −2, 0,5).</div>`;
        return;
      }
      const a = A.get(), b = B.get();
      const [ra, ca] = size(a), [rb, cb] = size(b);
      let R, err;
      if (op === "add" || op === "sub") {
        if (ra !== rb || ca !== cb) err = `<strong>Ce calcul est impossible.</strong>A et B n'ont pas la même taille. Pour additionner ou soustraire, il faut la même taille.`;
        else R = add(a, b, op === "add" ? 1 : -1);
      } else {
        const [L, Rt, nl, nr] = op === "mul" ? [a, b, "A", "B"] : [b, a, "B", "A"];
        const [rl, cl] = size(L), [rr, cr] = size(Rt);
        if (cl !== rr) err = `<strong>Ce calcul est impossible.</strong>${nl} a ${cl} colonne${cl > 1 ? "s" : ""}. ${nr} a ${rr} ligne${rr > 1 ? "s" : ""}. Ces 2 nombres doivent être égaux.`;
        else R = mul(L, Rt);
      }
      if (err) { result.innerHTML = `<div class="err">${err}</div>`; return; }

      result.innerHTML = `<span>${sym[op]} =</span>`;
      const out = document.createElement("div");
      out.className = "mx";
      renderMx(out, R);
      result.appendChild(out);
      const [rr, rc] = size(R);
      result.insertAdjacentHTML("beforeend", `<small>(${rr} × ${rc})</small>`);

      if (op === "mul" || op === "bma") {
        steps.innerHTML = `Touchez une case du résultat. Le calcul s'affiche ici.`;
        out.querySelectorAll(".cell").forEach((cell) => {
          const explain = () => {
            const i = +cell.dataset.i, j = +cell.dataset.j;
            const [L, Rt, LE, RE, nl, nr] = op === "mul" ? [a, b, A, B, "A", "B"] : [b, a, B, A, "B", "A"];
            clearHl();
            out.querySelectorAll(".cell").forEach((c) => c.classList.toggle("hl-out", c === cell));
            LE.cells().forEach((c) => +c.dataset.i === i && c.classList.add("hl-row"));
            RE.cells().forEach((c) => +c.dataset.j === j && c.classList.add("hl-col"));
            const terms = L[i].map((v, k) => `${fmt(v)}×${fmt(Rt[k][j])}`).join(" + ");
            steps.innerHTML = `<span class="pill">ligne ${i + 1} de ${nl} · colonne ${j + 1} de ${nr}</span> &nbsp; ${terms} = <strong>${fmt(R[i][j])}</strong>`;
          };
          cell.tabIndex = 0;
          cell.addEventListener("mouseenter", explain);
          cell.addEventListener("focus", explain);
        });
        // Comparaison A×B / B×A pour illustrer la non-commutativité
        const other = op === "mul" ? (cb === ra ? mul(b, a) : null) : (ca === rb ? mul(a, b) : null);
        const same = other && size(other).join() === size(R).join() && other.every((row, i) => row.every((v, j) => Math.abs(v - R[i][j]) < EPS));
        const otherName = op === "mul" ? "B × A" : "A × B";
        const msg = !other ? `${otherName} est impossible ici.` : same ? `Ici, ${otherName} donne le même résultat. C'est rare.` : `${otherName} donne un autre résultat. L'ordre est important.`;
        result.insertAdjacentHTML("beforeend", `<small style="font-family:var(--body);color:var(--ink-2)">${msg}</small>`);
      } else {
        steps.innerHTML = `On calcule case par case.`;
      }
    }

    opsLab.querySelector(".ops").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      op = btn.dataset.op;
      opsLab.querySelectorAll(".ops button").forEach((x) => x.setAttribute("aria-pressed", x === btn));
      compute();
    });
    compute();
  }

  /* ---------- 6. Propriétés ---------- */
  const propsLab = document.getElementById("props-lab");
  if (propsLab) {
    const tEl = document.getElementById("pr-t");
    const symEl = document.getElementById("pr-sym"), detEl = document.getElementById("pr-det"), rkEl = document.getElementById("pr-rank");
    const note = document.getElementById("pr-note");
    const P = createEditor(propsLab.querySelector(".editor"), { init: [[2, 7, 1], [7, 3, 4], [1, 4, 5]], onChange: analyse });

    function analyse() {
      if (!P.valid()) { note.textContent = "Corrigez la case invalide pour lancer l'analyse."; return; }
      const M = P.get();
      const [r, c] = size(M);
      const T = transpose(M);
      renderMx(tEl, T);
      const square = r === c;
      const sym = square && M.every((row, i) => row.every((v, j) => Math.abs(v - M[j][i]) < EPS));
      symEl.textContent = sym ? "Oui" : "Non";
      symEl.className = "stat-v " + (sym ? "yes" : "no");
      const d = square ? det(M) : null;
      detEl.textContent = square ? fmt(Math.round(d * 1e6) / 1e6) : "—";
      const rk = rank(M);
      rkEl.textContent = rk;
      const parts = [];
      if (!square) parts.push(`Cette matrice n'est pas carrée. Elle n'a pas de déterminant.`);
      else if (Math.abs(d) < EPS) parts.push(`Le déterminant est 0. Cette matrice n'a pas d'inverse.`);
      else parts.push(`Le déterminant n'est pas 0. Cette matrice a un inverse.`);
      parts.push(rk === Math.min(r, c) ? `Le rang est le plus grand possible (${rk}).` : `Le rang est ${rk}. C'est moins que ${Math.min(r, c)}. Des lignes se ressemblent trop.`);
      note.textContent = parts.join(" ");
    }
    propsLab.querySelector(".presets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-preset]");
      if (b) P.set(JSON.parse(b.dataset.preset));
    });
    analyse();
  }

  /* ---------- 7. Inverse ---------- */
  const invLab = document.getElementById("inv-lab");
  if (invLab) {
    const ed = invLab.querySelector(".editor");
    const out = document.getElementById("inv-out");
    const I = createEditor(ed, { init: JSON.parse(ed.dataset.init), fixed: true, onChange: inv });
    function inv() {
      if (!I.valid()) { out.innerHTML = `<p class="bad">Une case est invalide.</p>`; return; }
      const [[a, b], [c, d]] = I.get();
      const D = a * d - b * c;
      let html = `<div>Déterminant = ${fmt(a)}×${fmt(d)} − ${fmt(b)}×${fmt(c)} = <strong>${fmt(D)}</strong></div>`;
      if (Math.abs(D) < EPS) {
        html += `<p class="bad">Le déterminant est nul : A n'a pas d'inverse.</p>`;
        out.innerHTML = html;
        return;
      }
      const Ainv = [[d / D, -b / D], [-c / D, a / D]];
      html += `<div class="eq"><span>A⁻¹ =</span><div class="mx sm" id="inv-r"></div></div>
               <div class="eq"><span>A × A⁻¹ =</span><div class="mx sm diag" id="inv-check"></div></div>
               <p class="ok">On trouve la matrice identité I₂ : c'est juste.</p>`;
      out.innerHTML = html;
      renderMx(document.getElementById("inv-r"), Ainv);
      const check = mul(I.get(), Ainv).map((r) => r.map((v) => Math.round(v * 1e9) / 1e9));
      renderMx(document.getElementById("inv-check"), check, { diag: true });
    }
    inv();
  }

  /* ---------- 8. Transformations ---------- */
  const trSvg = document.getElementById("tr-svg");
  if (trSvg) {
    const rot = document.getElementById("t-rot"), k = document.getElementById("t-k");
    const shape = [[0, 0], [3, 0], [3, 2], [1.5, 3.3], [0, 2]]; // une petite maison
    const pts = (P) => P.map(([x, y]) => `${x},${-y}`).join(" ");
    function drawTr() {
      const t = (+rot.value * Math.PI) / 180, s = +k.value;
      document.getElementById("t-rot-o").textContent = rot.value + "°";
      document.getElementById("t-k-o").textContent = dec(s);
      const M = [[s * Math.cos(t), -s * Math.sin(t)], [s * Math.sin(t), s * Math.cos(t)]];
      drawAxes(trSvg);
      trSvg.appendChild(svgEl("polygon", { points: pts(shape), fill: "none", stroke: "#77727f", "stroke-width": 0.07, "stroke-dasharray": "0.2 0.15" }));
      const moved = shape.map(([x, y]) => [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y]);
      trSvg.appendChild(svgEl("polygon", { points: pts(moved), fill: "rgba(47,169,104,.35)", stroke: "#26232e", "stroke-width": 0.1, "stroke-linejoin": "round" }));
      renderMx(document.getElementById("tr-mx"), M.map((r) => r.map((v) => dec(v))));
    }
    rot.addEventListener("input", drawTr);
    k.addEventListener("input", drawTr);
    drawTr();
  }

  /* ---------- 9. Mini-modèle IA ---------- */
  const iaLab = document.getElementById("ia-lab");
  if (iaLab) {
    const X = [[1, 5], [2, 12], [3, 8], [1.5, 20], [4, 15], [0.5, 3]];
    const y = [7.6, 16.4, 16.9, 21.3, 26.2, 4.1];
    const names = ["Inès", "Baptiste", "Malo", "Yasmine", "Théo", "Soline"];
    const w1 = document.getElementById("w1"), w2 = document.getElementById("w2");
    const body = document.getElementById("ia-body");
    const lossEl = document.getElementById("ia-loss"), bar = document.getElementById("ia-bar");
    const LR = 0.003;
    const init = [2, 0.5];
    const mse = (w) => X.reduce((s, x, i) => s + (x[0] * w[0] + x[1] * w[1] - y[i]) ** 2, 0) / X.length;
    const baseLoss = mse(init);
    let timer = null;

    function render() {
      const w = [+w1.value, +w2.value];
      document.getElementById("w1-o").textContent = dec(w[0]);
      document.getElementById("w2-o").textContent = dec(w[1]);
      body.innerHTML = X.map((x, i) => {
        const p = x[0] * w[0] + x[1] * w[1];
        const dlt = p - y[i];
        return `<tr><td>${names[i]}</td><td>${dec(x[0], 1)} h</td><td>${x[1]} km</td><td>${dec(y[i], 1)} €</td><td class="pred">${dec(p, 1)} €<span class="delta">${dlt >= 0 ? "+" : ""}${dec(dlt, 1)}</span></td></tr>`;
      }).join("");
      const L = mse(w);
      lossEl.textContent = dec(L, 2);
      bar.style.transform = `scaleX(${Math.min(1, L / Math.max(baseLoss, L, 1e-6))})`;
    }
    function step() {
      const w = [+w1.value, +w2.value];
      // gradient = (2/n) · Xᵀ (Xw − y)
      const r = X.map((x, i) => x[0] * w[0] + x[1] * w[1] - y[i]);
      const g = [0, 1].map((k) => (2 / X.length) * X.reduce((s, x, i) => s + x[k] * r[i], 0));
      w1.value = Math.min(10, Math.max(0, w[0] - LR * g[0]));
      w2.value = Math.min(3, Math.max(0, w[1] - LR * g[1]));
      render();
    }
    const stop = () => { clearInterval(timer); timer = null; document.getElementById("ia-run").disabled = false; };
    w1.addEventListener("input", () => { stop(); render(); });
    w2.addEventListener("input", () => { stop(); render(); });
    document.getElementById("ia-step").addEventListener("click", () => { stop(); step(); });
    document.getElementById("ia-run").addEventListener("click", (e) => {
      if (timer) return;
      e.currentTarget.disabled = true;
      let n = 0;
      timer = setInterval(() => { step(); if (++n >= 50) stop(); }, 40);
    });
    document.getElementById("ia-reset").addEventListener("click", () => {
      stop(); w1.value = init[0]; w2.value = init[1]; render();
    });
    render();
  }

  /* ---------- 10. Quiz ---------- */
  const QUIZ = [
    { q: "Une matrice de taille 3 × 5 a…", a: ["3 colonnes et 5 lignes", "3 lignes et 5 colonnes"], ok: 1, fb: "on dit toujours les lignes en premier." },
    { q: "Un vecteur colonne a…", a: ["une seule colonne", "une seule ligne"], ok: 0, fb: "un vecteur colonne a une seule colonne." },
    { q: "A est 2 × 3. B est 3 × 4. Peut-on faire A × B ?", a: ["Oui", "Non"], ok: 0, fb: "A a 3 colonnes. B a 3 lignes. C'est égal. Le résultat est 2 × 4." },
    { q: "Peut-on additionner une matrice 2 × 2 et une matrice 2 × 3 ?", a: ["Oui", "Non"], ok: 1, fb: "les 2 matrices doivent avoir la même taille." },
    { q: "A × B est toujours pareil que B × A.", a: ["Vrai", "Faux"], ok: 1, fb: "l'ordre est important." },
    { q: "Si on multiplie A par la matrice identité, on trouve…", a: ["A", "0"], ok: 0, fb: "la matrice identité ne change rien, comme le nombre 1." },
    { q: "Une matrice symétrique est…", a: ["égale à sa transposée", "égale à 0"], ok: 0, fb: "A = Aᵀ." },
    { q: "Une matrice carrée a un inverse si son déterminant…", a: ["est 0", "n'est pas 0"], ok: 1, fb: "si le déterminant est 0, il n'y a pas d'inverse." },
    { q: "Quel est le déterminant de la matrice 3 2 / 1 4 ?", a: ["10", "14"], ok: 0, fb: "3 × 4 − 2 × 1 = 12 − 2 = 10." },
    { q: "Dans les données d'une IA, une ligne est…", a: ["un exemple", "un poids"], ok: 0, fb: "une ligne = un exemple. Une colonne = une information." }
  ];
  const form = document.getElementById("quiz-form");
  const score = document.getElementById("quiz-score");
  if (form) {
    form.innerHTML = QUIZ.map((item, n) => `
      <fieldset class="q" data-n="${n}">
        <legend><span>${n + 1}.</span>${item.q}</legend>
        ${item.a.map((txt, k) => `<label><input type="radio" name="q${n}" value="${k}" /> ${txt}</label>`).join("")}
        <p class="fb">${item.fb}</p>
      </fieldset>`).join("");

    document.getElementById("quiz-check").addEventListener("click", () => {
      let good = 0, answered = 0;
      form.querySelectorAll(".q").forEach((fs) => {
        const n = +fs.dataset.n;
        const sel = fs.querySelector("input:checked");
        fs.classList.remove("right", "wrong", "missing");
        if (!sel) { fs.classList.add("missing"); return; }
        answered++;
        const ok = +sel.value === QUIZ[n].ok;
        if (ok) good++;
        fs.classList.add(ok ? "right" : "wrong");
      });
      const missing = QUIZ.length - answered;
      score.textContent = `${good} / ${QUIZ.length}` + (missing ? ` — ${missing} question${missing > 1 ? "s" : ""} sans réponse` : good === QUIZ.length ? " — bravo !" : "");
    });
    document.getElementById("quiz-reset").addEventListener("click", () => {
      form.reset();
      form.querySelectorAll(".q").forEach((fs) => fs.classList.remove("right", "wrong", "missing"));
      score.textContent = "";
    });
  }

  /* ---------- Vidéos ---------- */
  const player = document.getElementById("player");
  const frame = document.getElementById("player-frame");
  document.querySelectorAll(".video-card").forEach((card) => {
    const id = card.dataset.yt;
    const name = card.querySelector(".video-name").textContent;
    card.innerHTML = `<span class="thumb"${id ? ` style="background-image:url('https://i.ytimg.com/vi/${id}/mqdefault.jpg')"` : ""}></span>
      <span class="meta">${card.innerHTML}</span>`;
    card.setAttribute("aria-label", `Lire la vidéo : ${name}`);
    if (!player || typeof player.showModal !== "function") return;
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const src = id
        ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
        : `https://www.youtube-nocookie.com/embed/videoseries?list=${card.dataset.list}&autoplay=1&rel=0`;
      frame.innerHTML = `<iframe src="${src}" title="${name}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      player.showModal();
    });
  });
  if (player) {
    const close = () => player.close();
    document.getElementById("player-close").addEventListener("click", close);
    player.addEventListener("click", (e) => { if (e.target === player) close(); });
    player.addEventListener("close", () => { frame.innerHTML = ""; });
  }

  /* ---------- Navigation & apparition ---------- */
  const chapters = [...document.querySelectorAll(".chapter")];
  const links = new Map([...document.querySelectorAll(".map a")].map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    chapters.forEach((c) => {
      if (c.getBoundingClientRect().top > window.innerHeight) c.classList.add("pending");
    });
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.remove("pending"); reveal.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    chapters.forEach((c) => reveal.observe(c));

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.remove("active"));
        const a = links.get(en.target.id);
        if (a) a.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    chapters.forEach((c) => spy.observe(c));
  }
})();
