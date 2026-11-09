/* Centro de Saúde Vitalis — Acessibilidade do usuário
   Módulo independente: para usar em qualquer página, inclua acessibilidade.css e este arquivo no <head>.
   Ele aplica as preferências salvas antes da primeira pintura (sem "piscar") e, quando o HTML terminar de
   carregar, cria sozinho o botão flutuante, o painel e os atalhos para pular ao conteúdo.

   Seções: 1 Preferências · 2 Aplicação na página · 3 Tema do app · 4 Painel · 5 Atalhos de teclado
           6 Rede de segurança (alt, rótulos) · 7 Inicialização
   Sem innerHTML com dados: textos entram sempre por textContent. */
(() => {
'use strict';
if (window.Acessibilidade) return;

/* =====================================================================
   1. PREFERÊNCIAS (salvas em localStorage; cada recurso é independente)
   ===================================================================== */
const CHAVE = 'vitalis:acessibilidade:v1';
const TAMANHOS = [87.5, 100, 112.5, 125, 150, 175, 200];           // % da fonte do navegador
const NIVEIS = ['Normal', 'Médio', 'Grande'];
const PADRAO = Object.freeze({
  tamanho: 100, contraste: false, leitura: false, tema: null,        // tema: null = segue o sistema
  links: false, fonte: false, foco: false, animacoes: false, letras: 0, linhas: 0
});
const FONTE_URL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
const raiz = document.documentElement;
const sistemaEscuro = matchMedia('(prefers-color-scheme: dark)');

function sanear(bruto) {
  const p = { ...PADRAO };
  if (!bruto || typeof bruto !== 'object') return p;
  if (TAMANHOS.includes(bruto.tamanho)) p.tamanho = bruto.tamanho;
  for (const k of ['contraste', 'leitura', 'links', 'fonte', 'foco', 'animacoes']) p[k] = bruto[k] === true;
  p.tema = bruto.tema === 'dark' || bruto.tema === 'light' ? bruto.tema : null;
  for (const k of ['letras', 'linhas']) p[k] = [0, 1, 2].includes(bruto[k]) ? bruto[k] : 0;
  if (p.leitura) p.tema = 'light';
  return p;
}
function carregar() {
  try { return sanear(JSON.parse(localStorage.getItem(CHAVE))); } catch { return { ...PADRAO }; }
}
function salvar() {
  try {
    const padrao = Object.keys(PADRAO).every(k => prefs[k] === PADRAO[k]);
    if (padrao) localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, JSON.stringify(prefs));
  } catch { /* armazenamento bloqueado: as escolhas valem só nesta visita */ }
}
let prefs = carregar();

/* =====================================================================
   2. APLICAÇÃO NA PÁGINA (classes e atributos no <html>; o CSS faz o resto)
   ===================================================================== */
const temaAplicado = () => prefs.leitura ? 'light' : prefs.tema;
const escuroAgora = () => { const t = raiz.getAttribute('data-theme'); return t ? t === 'dark' : sistemaEscuro.matches; };

function atributo(nome, valor) { if (valor) raiz.setAttribute(nome, String(valor)); else raiz.removeAttribute(nome); }

function carregarFonteLegivel() {
  if (document.getElementById('a11y-fonte-link') || !document.head) return;
  const l = document.createElement('link');
  l.id = 'a11y-fonte-link'; l.rel = 'stylesheet'; l.href = FONTE_URL;
  document.head.append(l);
}

function aplicar() {
  raiz.style.fontSize = prefs.tamanho === 100 ? '' : prefs.tamanho + '%';
  raiz.classList.toggle('a11y-contraste', prefs.contraste);
  raiz.classList.toggle('a11y-leitura', prefs.leitura);
  raiz.classList.toggle('a11y-links', prefs.links);
  raiz.classList.toggle('a11y-fonte', prefs.fonte);
  raiz.classList.toggle('a11y-foco', prefs.foco);
  raiz.classList.toggle('a11y-sem-animacao', prefs.animacoes);
  atributo('data-a11y-letras', prefs.letras);
  atributo('data-a11y-linhas', prefs.linhas);
  const tema = temaAplicado();
  if (tema) { if (raiz.getAttribute('data-theme') !== tema) raiz.setAttribute('data-theme', tema); }
  else if (raiz.hasAttribute('data-theme')) raiz.removeAttribute('data-theme');
  if (prefs.fonte) carregarFonteLegivel();
  sincronizarBotaoTema();
  atualizarPainel();
}

/* =====================================================================
   3. TEMA DO APP: o "Modo noturno" usa o mesmo data-theme do botão #btn-tema
   ===================================================================== */
const NS = 'http://www.w3.org/2000/svg';
const ICONES = {
  acessibilidade: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.3" r="1.35" fill="currentColor" stroke="none"/><path d="M7.4 10.2c1.5.5 3 .75 4.6.75s3.1-.25 4.6-.75"/><path d="M12 11v3.2"/><path d="m12 14.2-2 4M12 14.2l2 4"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  menos: '<path d="M6 12h12"/>',
  mais: '<path d="M12 6v12M6 12h12"/>',
  tamanho: '<path d="M3.5 19 8.5 6l5 13M5.3 14.5h6.4"/><path d="M18 9v6M15 12h6"/>',
  fonte: '<path d="M3.5 19 8 6.5 12.5 19M5.2 14.8h5.6"/><path d="M15 19v-3.4a2.2 2.2 0 0 1 4.4 0V19M15 17.2h4.4"/>',
  letras: '<path d="M8.5 13.5 12 4.5l3.5 9M9.8 10.8h4.4"/><path d="M4 19h16M4 19l2.6-2.2M4 19l2.6 2.2M20 19l-2.6-2.2M20 19l-2.6 2.2"/>',
  linhas: '<path d="M4 7h10M4 12h10M4 17h10"/><path d="M19.5 5.5v13M19.5 5.5l-2 2.4M19.5 5.5l2 2.4M19.5 18.5l-2-2.4M19.5 18.5l2-2.4"/>',
  contraste: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor"/>',
  noturno: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  leitura: '<path d="M12 7c-1.8-1.4-4.2-2-7.5-2v12c3.3 0 5.7.6 7.5 2 1.8-1.4 4.2-2 7.5-2V5c-3.3 0-5.7.6-7.5 2Z"/><path d="M12 7v12"/>',
  links: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  foco: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="2.2"/>',
  animacoes: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7M14 8.5v7"/>',
  redefinir: '<path d="M4 4.5v5h5"/><path d="M4.9 9.4a8 8 0 1 1 1.7 8.1"/>'
};
function svg(nome, tam = 20, extra = '') {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam); s.setAttribute('height', tam);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('class', ('a11y-ic ' + extra).trim());
  s.innerHTML = ICONES[nome];                // somente strings fixas deste arquivo
  return s;
}

// O botão de tema do app troca o ícone só quando clicado; aqui ele fica coerente com qualquer origem da mudança.
function sincronizarBotaoTema() {
  const b = document.getElementById('btn-tema');
  if (b) b.replaceChildren(svg(escuroAgora() ? 'sol' : 'noturno', 20, 'ic'));
}

// Se o tema mudar por fora (botão do app), a preferência acompanha e fica salva.
new MutationObserver(() => {
  const atual = raiz.getAttribute('data-theme');
  if (atual === temaAplicado()) return;
  prefs.tema = atual === 'dark' || atual === 'light' ? atual : null;
  if (atual === 'dark') prefs.leitura = false;
  salvar(); aplicar();
}).observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });
sistemaEscuro.addEventListener('change', () => atualizarPainel());

/* =====================================================================
   4. PAINEL
   ===================================================================== */
const CHAVES = {
  fonte:     { nome: 'Fonte de fácil leitura',        dica: 'Letras mais abertas e fáceis de distinguir.',        icone: 'fonte' },
  contraste: { nome: 'Contraste alto',                dica: 'Fundo preto, texto branco e detalhes em amarelo.',   icone: 'contraste' },
  noturno:   { nome: 'Modo noturno',                  dica: 'Fundo escuro, que cansa menos a vista.',             icone: 'noturno' },
  leitura:   { nome: 'Modo de leitura (fundo claro)', dica: 'Fundo claro, linhas mais soltas e sem enfeites.',    icone: 'leitura' },
  links:     { nome: 'Destacar links e botões',       dica: 'Sublinha os links e contorna os botões.',            icone: 'links' },
  foco:      { nome: 'Foco do teclado reforçado',     dica: 'Contorno grande no item selecionado ao usar a tecla Tab.', icone: 'foco' },
  animacoes: { nome: 'Pausar animações',              dica: 'Interrompe movimentos e transições da página.',      icone: 'animacoes' }
};
const SEGMENTOS = {
  letras: { nome: 'Espaço entre letras', icone: 'letras' },
  linhas: { nome: 'Espaço entre linhas', icone: 'linhas' }
};
const GRUPOS = [
  { titulo: 'Texto',      itens: ['tamanho', 'fonte', 'letras', 'linhas'] },
  { titulo: 'Cores',      itens: ['contraste', 'noturno', 'leitura'] },
  { titulo: 'Navegação',  itens: ['links', 'foco', 'animacoes'] }
];
// O que cada chave muda nas preferências (noturno e leitura nunca ficam ligados juntos)
const ACOES = {
  fonte:     v => { prefs.fonte = v; },
  contraste: v => { prefs.contraste = v; },
  noturno:   v => { prefs.tema = v ? 'dark' : 'light'; if (v) prefs.leitura = false; },
  leitura:   v => { prefs.leitura = v; if (v) prefs.tema = 'light'; },
  links:     v => { prefs.links = v; },
  foco:      v => { prefs.foco = v; },
  animacoes: v => { prefs.animacoes = v; }
};
const valorChave = id => id === 'noturno' ? escuroAgora() && !prefs.leitura : prefs[id];

function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) el.append(f.nodeType ? f : document.createTextNode(String(f)));
  return el;
}
const icone = nome => h('span', { class: 'a11y-ico', 'aria-hidden': 'true' }, svg(nome, 20));

function linhaChave(id) {
  const d = CHAVES[id], nomeId = `a11y-${id}-nome`, dicaId = `a11y-${id}-dica`;
  return h('label', { class: 'a11y-linha' },
    icone(d.icone),
    h('span', {}, h('span', { class: 'a11y-nome', id: nomeId, text: d.nome }), h('span', { class: 'a11y-dica', id: dicaId, text: d.dica })),
    h('input', { type: 'checkbox', role: 'switch', class: 'a11y-chave', id: `a11y-${id}`, 'data-chave': id, 'aria-labelledby': nomeId, 'aria-describedby': dicaId }));
}
function linhaSegmento(id) {
  const d = SEGMENTOS[id], nomeId = `a11y-${id}-nome`;
  return h('div', { class: 'a11y-linha a11y-fixa' },
    icone(d.icone),
    h('span', { class: 'a11y-nome', id: nomeId, text: d.nome }),
    h('div', { class: 'a11y-seg a11y-ctrl', role: 'radiogroup', 'aria-labelledby': nomeId },
      NIVEIS.map((txt, i) => h('label', {}, h('input', { type: 'radio', name: `a11y-${id}`, value: i, 'data-seg': id }), h('span', { text: txt })))));
}
function linhaTamanho() {
  const nomeId = 'a11y-tamanho-nome';
  return h('div', { class: 'a11y-linha a11y-fixa' },
    icone('tamanho'),
    h('span', {}, h('span', { class: 'a11y-nome', id: nomeId, text: 'Tamanho do texto' }),
      h('button', { type: 'button', class: 'a11y-mini', id: 'a11y-tamanho-padrao', 'data-acao': 'padrao', hidden: true, text: 'Voltar ao tamanho padrão' })),
    h('div', { class: 'a11y-passo', role: 'group', 'aria-labelledby': nomeId },
      h('button', { type: 'button', id: 'a11y-menos', 'data-acao': 'menos', 'aria-label': 'Diminuir o tamanho do texto' }, svg('menos', 20)),
      h('span', { class: 'a11y-valor', id: 'a11y-tamanho-valor', text: '100%' }),
      h('button', { type: 'button', id: 'a11y-mais', 'data-acao': 'mais', 'aria-label': 'Aumentar o tamanho do texto' }, svg('mais', 20))));
}

let fab, painel, titulo, aviso, aberto = false;

function construir() {
  const pular = h('nav', { class: 'a11y-pular', 'aria-label': 'Atalhos de acessibilidade' },
    h('a', { href: '#conteudo-principal', 'data-alvo': 'conteudo', text: 'Pular para o conteúdo principal' }),
    h('a', { href: '#a11y-fab', 'data-alvo': 'painel', text: 'Abrir opções de acessibilidade' }));

  fab = h('button', { type: 'button', class: 'a11y-fab', id: 'a11y-fab', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    'aria-controls': 'a11y-painel', 'aria-label': 'Opções de acessibilidade', title: 'Acessibilidade' }, svg('acessibilidade', 30));

  titulo = h('h2', { id: 'a11y-titulo', tabindex: '-1', text: 'Acessibilidade' });
  aviso = h('p', { class: 'a11y-sr', id: 'a11y-aviso', role: 'status', 'aria-live': 'polite' });

  const corpo = h('div', { class: 'a11y-corpo' }, GRUPOS.map(g => {
    const hId = `a11y-g-${g.titulo.toLowerCase()}`;
    return h('div', { class: 'a11y-grupo', role: 'group', 'aria-labelledby': hId },
      h('h3', { id: hId, text: g.titulo }),
      g.itens.map(id => id === 'tamanho' ? linhaTamanho() : SEGMENTOS[id] ? linhaSegmento(id) : linhaChave(id)));
  }));

  painel = h('section', { class: 'a11y-painel', id: 'a11y-painel', role: 'dialog', 'aria-labelledby': 'a11y-titulo', 'aria-describedby': 'a11y-desc' },
    h('header', { class: 'a11y-topo' },
      h('div', {}, titulo, h('p', { id: 'a11y-desc', text: 'Ajuste o site ao seu jeito. As escolhas ficam salvas neste aparelho.' })),
      h('button', { type: 'button', class: 'a11y-fechar', 'data-acao': 'fechar', 'aria-label': 'Fechar opções de acessibilidade' }, svg('fechar', 20))),
    corpo,
    h('footer', { class: 'a11y-pe' },
      h('p', { text: 'Teclado: Tab avança, Shift + Tab volta e Esc fecha este painel.' }),
      h('button', { type: 'button', class: 'a11y-redefinir', 'data-acao': 'redefinir' }, svg('redefinir', 18), h('span', { text: 'Redefinir tudo' }))),
    aviso);
  painel.inert = true;

  const raizUi = h('div', { class: 'a11y', id: 'a11y-raiz' }, fab, painel);
  document.body.prepend(pular);
  document.body.append(raizUi);

  fab.addEventListener('click', () => aberto ? fechar(true) : abrir());
  painel.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.chave) alternar(t.dataset.chave, t.checked);
    else if (t.dataset.seg) definirNivel(t.dataset.seg, Number(t.value));
  });
  painel.addEventListener('click', e => {
    const b = e.target.closest('[data-acao]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const a = b.dataset.acao;
    if (a === 'fechar') fechar(true);
    else if (a === 'menos') passo(-1);
    else if (a === 'mais') passo(1);
    else if (a === 'padrao') definirTamanho(100);
    else if (a === 'redefinir') redefinir();
  });
  pular.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    if (a.dataset.alvo === 'painel') abrir(); else irParaConteudo();
  });
  atualizarPainel();
}

function anunciar(txt) {
  if (!aviso) return;
  aviso.textContent = '';
  setTimeout(() => { aviso.textContent = txt; }, 30);   // limpar antes garante nova leitura do mesmo texto
}
function atualizarPainel() {
  if (!painel) return;
  for (const id of Object.keys(CHAVES)) { const i = painel.querySelector(`#a11y-${id}`); if (i) i.checked = !!valorChave(id); }
  for (const id of Object.keys(SEGMENTOS))
    painel.querySelectorAll(`input[data-seg="${id}"]`).forEach(i => { i.checked = Number(i.value) === prefs[id]; });
  const idx = TAMANHOS.indexOf(prefs.tamanho);
  painel.querySelector('#a11y-tamanho-valor').textContent = prefs.tamanho.toLocaleString('pt-BR') + '%';
  painel.querySelector('#a11y-menos').setAttribute('aria-disabled', String(idx === 0));
  painel.querySelector('#a11y-mais').setAttribute('aria-disabled', String(idx === TAMANHOS.length - 1));
  painel.querySelector('#a11y-tamanho-padrao').hidden = prefs.tamanho === 100;
}

function mudou(mensagem) { salvar(); aplicar(); anunciar(mensagem); }
function alternar(id, valor) { ACOES[id](valor); mudou(`${CHAVES[id].nome} ${valor ? 'ativado' : 'desativado'}.`); }
function definirNivel(id, n) { prefs[id] = n; mudou(`${SEGMENTOS[id].nome}: ${NIVEIS[n].toLowerCase()}.`); }
function definirTamanho(pct) {
  prefs.tamanho = pct;
  mudou(`Tamanho do texto: ${pct.toLocaleString('pt-BR')}%.`);
}
function passo(dir) {
  const i = TAMANHOS.indexOf(prefs.tamanho) + dir;
  if (i < 0 || i >= TAMANHOS.length) return anunciar(dir > 0 ? 'Tamanho máximo do texto atingido.' : 'Tamanho mínimo do texto atingido.');
  definirTamanho(TAMANHOS[i]);
}
function redefinir() {
  prefs = { ...PADRAO };
  salvar(); aplicar();
  anunciar('Todas as configurações de acessibilidade foram redefinidas.');
}

function abrir() {
  if (aberto || !painel) return;
  aberto = true;
  painel.inert = false;
  painel.classList.add('a11y-aberto');
  fab.setAttribute('aria-expanded', 'true');
  titulo.focus({ preventScroll: true });
}
function fechar(devolverFoco) {
  if (!aberto) return;
  aberto = false;
  if (devolverFoco || painel.contains(document.activeElement)) fab.focus({ preventScroll: true });
  painel.classList.remove('a11y-aberto');
  painel.inert = true;
  fab.setAttribute('aria-expanded', 'false');
}

// No celular o app tem uma barra de navegação fixa no rodapé; o botão flutuante precisa ficar acima dela,
// seja qual for a altura que ela tenha (muda com o tamanho da fonte). Para outra página, troque o seletor.
const BARRA_INFERIOR = '.side';
function medirBarra() {
  const b = document.querySelector(BARRA_INFERIOR);
  let altura = 0;
  if (b && b.getClientRects().length) { const r = b.getBoundingClientRect(); if (r.top > innerHeight / 2) altura = Math.ceil(innerHeight - r.top); }
  if (altura) raiz.style.setProperty('--a11y-barra', altura + 'px'); else raiz.style.removeProperty('--a11y-barra');
}

/* =====================================================================
   5. TECLADO E ATALHOS
   ===================================================================== */
function irParaConteudo() {
  const principal = [...document.querySelectorAll('main, [role="main"]')].find(m => m.getClientRects().length);
  if (!principal) return;
  const alvo = principal.querySelector('h1') || principal;
  if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
  alvo.focus();
  alvo.scrollIntoView({ block: 'start' });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && aberto && (painel.contains(document.activeElement) || document.activeElement === fab)) {
    e.preventDefault(); fechar(true);
  }
});
document.addEventListener('pointerdown', e => {          // clicar fora fecha o painel (sem roubar o foco do que foi clicado)
  if (aberto && !e.target.closest('#a11y-raiz')) fechar(false);
});
addEventListener('storage', e => {                        // outra aba mudou as preferências
  if (e.key === CHAVE || e.key === null) { prefs = carregar(); aplicar(); }
});

/* =====================================================================
   6. REDE DE SEGURANÇA: o app cria muito conteúdo por JavaScript; aqui garantimos o básico
   (imagem sem alt e campo sem rótulo) mesmo que alguém esqueça.
   ===================================================================== */
function nomeAcessivel(el) {
  return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || (el.labels && el.labels.length) || el.getAttribute('title');
}
function reforcar(no) {
  if (!no || no.nodeType !== 1) return;
  const alvos = [no, ...no.querySelectorAll('img, input, select, textarea')];
  for (const el of alvos) {
    const tag = el.tagName;
    if (tag === 'IMG' && !el.hasAttribute('alt')) el.setAttribute('alt', el.getAttribute('title') || '');   // sem alt = decorativa
    else if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && el.type !== 'hidden' && !nomeAcessivel(el)) {
      const dica = el.getAttribute('placeholder'); if (dica) el.setAttribute('aria-label', dica);
    }
  }
}
function vigiarConteudo() {
  let fila = new Set(), agendado = false;
  new MutationObserver(muts => {
    for (const m of muts) m.addedNodes.forEach(n => n.nodeType === 1 && fila.add(n));
    if (agendado || !fila.size) return;
    agendado = true;
    requestAnimationFrame(() => { fila.forEach(reforcar); fila = new Set(); agendado = false; });
  }).observe(document.body, { childList: true, subtree: true });
}

/* =====================================================================
   7. INICIALIZAÇÃO
   ===================================================================== */
aplicar();                                                 // antes da primeira pintura: sem piscar
function iniciar() {
  if (!raiz.getAttribute('lang')) raiz.setAttribute('lang', 'pt-BR');
  construir();
  reforcar(document.body);
  vigiarConteudo();
  sincronizarBotaoTema();
  const barra = document.querySelector(BARRA_INFERIOR);
  if (barra) new ResizeObserver(medirBarra).observe(barra);
  addEventListener('resize', medirBarra);
  medirBarra();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

window.Acessibilidade = Object.freeze({ abrir, fechar: () => fechar(true), redefinir, preferencias: () => ({ ...prefs }) });
})();
