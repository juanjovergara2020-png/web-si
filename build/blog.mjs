// Generador del blog de juanjovergara.com
// Lee los posts de contenido/blog/*.md (los que crea Pages CMS) y escribe:
//   blog/index.html          → listado con buscador y filtro
//   blog/<post>/index.html   → una página por post
// Netlify lo ejecuta solo en cada publicación (ver netlify.toml). No necesita instalar nada.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from './vendor/marked.esm.js';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ORIGEN = path.join(RAIZ, 'contenido/blog');
const DESTINO = path.join(RAIZ, 'blog');
const WEB = 'https://juanjovergara.com';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ---------- lectura de los posts ---------- */

// YAML sencillo del frontmatter: textos (con o sin comillas, en varias líneas), listas, sí/no
function leerYaml(texto) {
  const datos = {};
  const lineas = texto.split('\n');
  let clave = null;
  for (const linea of lineas) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    const lista = linea.match(/^\s+-\s+(.*)$/);
    if (lista && clave) { (datos[clave] = Array.isArray(datos[clave]) ? datos[clave] : []).push(valor(lista[1])); continue; }
    const par = linea.match(/^([\w-]+):\s*(.*)$/);
    if (par) { clave = par[1]; datos[clave] = par[2] === '' ? '' : valor(par[2]); continue; }
    if (/^\s+/.test(linea) && clave && typeof datos[clave] === 'string') {   // continuación de una línea larga
      datos[clave] = valor(datos[clave] + ' ' + linea.trim());
    }
  }
  return datos;
}
function valor(v) {
  v = v.trim();
  if (/^".*"$/s.test(v)) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (/^'.*'$/s.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (/^".*/.test(v) || /^'.*/.test(v)) return v;                        // comilla abierta: sigue en la línea siguiente
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(x => valor(x)).filter(Boolean);
  return v;
}

function leerPost(archivo) {
  const texto = fs.readFileSync(path.join(ORIGEN, archivo), 'utf8').replace(/\r\n/g, '\n');
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = m ? leerYaml(m[1]) : {};
  const cuerpo = m ? m[2] : texto;
  const slug = archivo.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fechaTxt = String(meta.date || meta.fecha || archivo.slice(0, 10));
  const fecha = new Date(fechaTxt.length <= 10 ? fechaTxt + 'T12:00:00' : fechaTxt);
  const html = marked.parse(cuerpo, { gfm: true, breaks: false });
  const textoPlano = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const resumen = (meta.resumen && String(meta.resumen).trim()) || recortar(textoPlano, 190);
  const etiquetas = Array.isArray(meta.etiquetas) ? meta.etiquetas : (meta.etiquetas ? String(meta.etiquetas).split(',').map(s => s.trim()) : []);
  return {
    slug, archivo, html, resumen, etiquetas,
    titulo: String(meta.title || meta.titulo || slug).replace(/\s+/g, ' ').trim(),
    imagen: meta.image || meta.imagen || '',
    alt: meta.alt || '',
    origen: meta.origen || '',
    borrador: meta.borrador === true || meta.draft === true,
    fecha: isNaN(fecha) ? new Date(0) : fecha,
    minutos: Math.max(1, Math.round(textoPlano.split(' ').length / 220)),
  };
}

const recortar = (t, n) => t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fechaLarga = d => d.getTime() ? `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` : '';
const urlImagen = (img, prefijo) => !img ? '' : /^https?:\/\//.test(img) ? img : (img.startsWith('/') ? img : prefijo + img);

/* ---------- plantilla común (cabecera y pie como en el resto de la web) ---------- */

function pagina({ titulo, descripcion, url, imagen, cuerpo, raiz, tipo = 'website' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:type" content="${tipo}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${WEB}${url}">
${imagen ? `<meta property="og:image" content="${esc(/^https?:/.test(imagen) ? imagen : WEB + imagen)}">` : ''}
<link rel="canonical" href="${WEB}${url}">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${raiz}blog/blog.css">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/comun/menu.css">
</head>
<body>
<script src="/comun/menu.js"></script>
${cuerpo}
</body>
</html>
`;
}

/* ---------- páginas ---------- */

function paginaPost(p, anterior, siguiente) {
  const img = urlImagen(p.imagen, '../../');
  const cuerpo = `
<main class="post">
  <a class="volver" href="../">← Todos los posts</a>
  <h1>${esc(p.titulo)}</h1>
  <p class="post-meta">${fechaLarga(p.fecha)} · ${p.minutos} min de lectura${p.origen ? ` · ${esc(p.origen)}` : ''}</p>
  ${img ? `<img class="post-portada" src="${esc(img)}" alt="${esc(p.alt || p.titulo)}">` : ''}
  <article class="post-texto">
${p.html}
  </article>
  ${p.etiquetas.length ? `<p class="post-etiquetas">${p.etiquetas.map(e => `<span>${esc(e)}</span>`).join('')}</p>` : ''}
  <nav class="post-nav">
    ${siguiente ? `<a href="../${siguiente.slug}/">← ${esc(siguiente.titulo)}</a>` : '<span></span>'}
    ${anterior ? `<a href="../${anterior.slug}/">${esc(anterior.titulo)} →</a>` : '<span></span>'}
  </nav>
</main>
<script>
  // los enlaces a otras webs se abren en pestaña nueva
  document.querySelectorAll('.post-texto a[href^="http"]').forEach(a => { if (!a.href.startsWith(location.origin)) { a.target = '_blank'; a.rel = 'noopener'; } });
</script>`;
  return pagina({ titulo: `${p.titulo} | Blog de Juanjo Vergara`, descripcion: p.resumen, url: `/blog/${p.slug}/`, imagen: urlImagen(p.imagen, '/'), cuerpo, raiz: '../../', tipo: 'article' });
}

function paginaListado(posts) {
  const datos = posts.map(p => ({ t: p.titulo, s: p.slug, f: fechaLarga(p.fecha), a: p.fecha.getFullYear(), r: p.resumen, i: urlImagen(p.imagen, '../'), o: p.origen, e: p.etiquetas }));
  const origenes = [...new Set(posts.map(p => p.origen).filter(Boolean))];
  const cuerpo = `
<main class="listado">
  <h1 class="titulo-seccion">Blog</h1>
  <p class="intro">Reflexiones sobre educación, ABP y aprendizaje, escritas a lo largo de los años.</p>
  <div class="herramientas">
    <input type="search" class="buscador" id="buscar" placeholder="Buscar en el blog…" aria-label="Buscar en el blog">
    ${origenes.length > 1 ? `<select class="tipo" id="filtro" aria-label="Filtrar por blog de origen"><option value="">Todos (${posts.length})</option>${origenes.map(o => `<option value="${esc(o)}">${esc(o)} (${posts.filter(p => p.origen === o).length})</option>`).join('')}</select>` : ''}
  </div>
  <p class="aviso" id="aviso" hidden></p>
  <div class="rejilla" id="rejilla"></div>
  <button class="ver-mas" id="ver-mas" hidden></button>
</main>
<script>
{
  const POSTS = ${JSON.stringify(datos)};
  const PAGINA = 12;
  let mostrar = PAGINA, texto = '', origen = '';
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function pintar() {
    const vis = POSTS.filter(p => (!origen || p.o === origen) && (!texto || norm([p.t, p.r, p.e.join(' '), p.a].join(' ')).includes(texto)));
    document.getElementById('rejilla').innerHTML = vis.slice(0, mostrar).map(p => \`
      <a class="tarjeta" href="\${p.s}/">
        \${p.i ? \`<img src="\${esc(p.i)}" alt="" loading="lazy">\` : '<div class="sin-imagen"></div>'}
        <div class="tarjeta-texto"><h2>\${esc(p.t)}</h2><p class="fecha">\${esc(p.f)}\${p.o ? ' · ' + esc(p.o) : ''}</p><p>\${esc(p.r)}</p></div>
      </a>\`).join('') || '<p class="sin-resultados">No hay posts que coincidan con la búsqueda.</p>';
    const b = document.getElementById('ver-mas'); const resto = vis.length - mostrar;
    b.hidden = resto <= 0; b.textContent = \`Ver más (\${resto} más)\`;
    const av = document.getElementById('aviso');
    av.hidden = !(texto || origen); av.textContent = \`\${vis.length} post\${vis.length === 1 ? '' : 's'} encontrados\`;
  }
  document.getElementById('buscar').addEventListener('input', e => { texto = norm(e.target.value.trim()); mostrar = PAGINA; pintar(); });
  const f = document.getElementById('filtro'); if (f) f.addEventListener('change', () => { origen = f.value; f.classList.toggle('activo', !!origen); mostrar = PAGINA; pintar(); });
  document.getElementById('ver-mas').onclick = () => { mostrar += PAGINA; pintar(); };
  pintar();
}
</script>`;
  return pagina({ titulo: 'Blog | Juanjo Vergara', descripcion: 'Blog de Juanjo Vergara: reflexiones sobre educación, aprendizaje basado en proyectos (ABP) y metodologías activas.', url: '/blog/', cuerpo, raiz: '../' });
}

/* ---------- ejecución ---------- */

const archivos = fs.existsSync(ORIGEN) ? fs.readdirSync(ORIGEN).filter(f => f.endsWith('.md')) : [];
const posts = archivos.map(leerPost).filter(p => !p.borrador).sort((a, b) => b.fecha - a.fecha);
// si dos posts tienen el mismo título, el más reciente lleva -2, -3…
const usados = new Set();
[...posts].reverse().forEach(p => { let s = p.slug, n = 2; while (usados.has(s)) s = `${p.slug}-${n++}`; usados.add(s); p.slug = s; });
fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
fs.copyFileSync(path.join(RAIZ, 'build/blog.css'), path.join(DESTINO, 'blog.css'));
fs.writeFileSync(path.join(DESTINO, 'index.html'), paginaListado(posts));
posts.forEach((p, i) => {
  fs.mkdirSync(path.join(DESTINO, p.slug), { recursive: true });
  fs.writeFileSync(path.join(DESTINO, p.slug, 'index.html'), paginaPost(p, posts[i + 1], posts[i - 1]));
});
console.log(`Blog generado: ${posts.length} posts publicados (${archivos.length - posts.length} borradores).`);
