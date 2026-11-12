'use strict';
// NotaUPSA: notas por materia, nota actual, cuánto falta y promedio ponderado por créditos.
const $ = s => document.querySelector(s);
const CLAVE = 'notaupsa.v1';
const COLORES = ['#22e6ff', '#ff2e88', '#ffe14d', '#3dff8a', '#b26bff', '#ff8a2e'];
const PLANTILLA = () => [
  { n: 'Primer parcial', p: 25, v: null }, { n: 'Segundo parcial', p: 25, v: null },
  { n: 'Prácticas y tareas', p: 20, v: null }, { n: 'Examen final', p: 30, v: null },
];

let datos;
try { datos = JSON.parse(localStorage.getItem(CLAVE)); } catch { datos = null; }
if (!datos || !Array.isArray(datos.materias)) datos = { aprob: 51, materias: [
  { nombre: 'Cálculo I', cred: 5, evals: [{ n: 'Primer parcial', p: 25, v: 62 }, { n: 'Segundo parcial', p: 25, v: 48 }, { n: 'Prácticas y tareas', p: 20, v: 80 }, { n: 'Examen final', p: 30, v: null }] },
  { nombre: 'Programación', cred: 5, evals: [{ n: 'Primer parcial', p: 25, v: 90 }, { n: 'Segundo parcial', p: 25, v: 85 }, { n: 'Proyecto', p: 20, v: null }, { n: 'Examen final', p: 30, v: null }] },
] };
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { } };

function calcular(m) {
  let actual = 0, hecho = 0, total = 0;
  m.evals.forEach(e => { const p = +e.p || 0; total += p; if (e.v !== null && e.v !== '' && !isNaN(e.v)) { actual += e.v * p / 100; hecho += p; } });
  const resto = total - hecho, meta = +datos.aprob || 51;
  const necesita = resto > 0 ? (meta - actual) / resto * 100 : null;
  const maximo = actual + resto; // si saca 100 en todo lo que falta
  return { actual, hecho, total, resto, necesita, maximo, meta };
}

function veredicto(r) {
  const f = x => x.toFixed(1).replace('.', ',');
  if (r.total !== 100) return `<span class="ojo">Los pesos suman ${r.total} %, deberían sumar 100 %.</span>`;
  if (r.resto === 0) return r.actual >= r.meta ? `<b class="ok">${f(r.actual)}</b> · aprobada ✓` : `<b class="mal">${f(r.actual)}</b> · reprobada, te faltaron ${f(r.meta - r.actual)} puntos`;
  if (r.necesita <= 0) return `<b class="ok">Ya aprobaste</b> con ${f(r.actual)} puntos asegurados.`;
  if (r.necesita > 100) return `<b class="mal">Ya no alcanza.</b> Aunque saques 100 llegas a ${f(r.maximo)}.`;
  const cls = r.necesita > 75 ? 'mal' : r.necesita > 55 ? 'ojo' : 'ok';
  return `Llevas <b>${f(r.actual)}</b> de ${r.hecho} posibles. Necesitas <b class="${cls}">${f(r.necesita)}</b> de promedio en lo que falta (${r.resto} %).`;
}

function pintar() {
  const main = $('#materias'); main.innerHTML = '';
  datos.materias.forEach((m, mi) => {
    const t = $('#t-materia').content.firstElementChild.cloneNode(true);
    t.style.setProperty('--c', COLORES[mi % COLORES.length]);
    const nom = t.querySelector('.nombre'), cr = t.querySelector('.creditos');
    nom.value = m.nombre; cr.value = m.cred ?? '';
    nom.oninput = () => { m.nombre = nom.value; guardar(); };
    cr.oninput = () => { m.cred = cr.value === '' ? null : +cr.value; guardar(); resumen(); };
    t.querySelector('.borrar').onclick = () => { if (confirm(`¿Borrar ${m.nombre || 'esta materia'}?`)) { datos.materias.splice(mi, 1); guardar(); pintar(); } };
    const ev = t.querySelector('.evals');
    ev.insertAdjacentHTML('beforeend', '<div class="cols"><span>EVALUACIÓN</span><span>PESO %</span><span>NOTA</span><span></span></div>');
    m.evals.forEach((e, ei) => {
      const fila = document.createElement('div'); fila.className = 'eval';
      fila.innerHTML = `<input class="n" aria-label="Evaluación"><input class="peso" type="number" min="0" max="100" aria-label="Peso"><input class="nota" type="number" min="0" max="100" step="0.1" placeholder="?" inputmode="decimal" aria-label="Nota"><button class="x" title="Quitar">✕</button>`;
      const [n, p, v] = fila.querySelectorAll('input');
      n.value = e.n; p.value = e.p; v.value = e.v ?? ''; v.classList.toggle('vacia', e.v === null);
      n.oninput = () => { e.n = n.value; guardar(); };
      p.oninput = () => { e.p = +p.value; guardar(); actualizar(t, m); };
      v.oninput = () => { e.v = v.value === '' ? null : Math.max(0, Math.min(100, +v.value)); v.classList.toggle('vacia', e.v === null); guardar(); actualizar(t, m); };
      fila.querySelector('.x').onclick = () => { m.evals.splice(ei, 1); guardar(); pintar(); };
      ev.appendChild(fila);
    });
    t.querySelector('.mas').onclick = () => { m.evals.push({ n: 'Evaluación', p: 0, v: null }); guardar(); pintar(); };
    main.appendChild(t); actualizar(t, m);
  });
  resumen();
}

function actualizar(t, m) {
  const r = calcular(m);
  t.querySelector('.hecho').style.width = Math.min(100, r.actual) + '%';
  t.querySelector('.falta').style.width = Math.max(0, Math.min(100 - r.actual, r.resto)) + '%';
  t.querySelector('.linea').style.left = r.meta + '%';
  t.querySelector('.veredicto').innerHTML = veredicto(r);
  resumen();
}

function resumen() {
  let suma = 0, pesos = 0, riesgo = 0;
  datos.materias.forEach(m => {
    const r = calcular(m);
    if (r.hecho > 0) { const nota = r.resto === 0 ? r.actual : r.actual / r.hecho * 100, w = m.cred || 1; suma += nota * w; pesos += w; }
    if ((r.resto > 0 && r.necesita > 75) || (r.resto === 0 && r.actual < r.meta)) riesgo++;
  });
  $('#prom').textContent = pesos ? (suma / pesos).toFixed(1).replace('.', ',') : '—';
  $('#nmat').textContent = datos.materias.length;
  $('#nriesgo').textContent = riesgo;
}

$('#aprob').value = datos.aprob;
$('#aprob').oninput = () => { datos.aprob = +$('#aprob').value || 51; guardar(); pintar(); };
$('#nueva').onclick = () => { datos.materias.push({ nombre: '', cred: null, evals: PLANTILLA() }); guardar(); pintar(); document.querySelector('.materia:last-child .nombre').focus(); };
$('#exportar').onclick = () => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
  a.download = 'mis-notas.json'; a.click();
};
$('#importar').onchange = async e => {
  try { const d = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(d.materias)) throw 0; datos = d; guardar(); $('#aprob').value = datos.aprob; pintar(); }
  catch { alert('Ese archivo no es un respaldo de NotaUPSA.'); }
};

let promptInstalar;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; $('#instalar').hidden = false; });
$('#instalar').onclick = () => { promptInstalar?.prompt(); $('#instalar').hidden = true; };
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
pintar();
