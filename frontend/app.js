(() => {
'use strict';

const CONFIG = {
  MODO: location.protocol === 'file:' ? 'demo' : 'api',
  BASE_URL: '',
  INATIVIDADE_MS: 10 * 60 * 1000,
  MAX_TENTATIVAS: 5,
  BLOQUEIO_S: 30
};

let sessao = null, pacientes = [], consultas = [], usuarios = [], viewAtual = 'inicio', ultimoFoco = null;
const ehAdmin = () => sessao?.papel === 'ADMIN';

const delay = ms => new Promise(r => setTimeout(r, ms));
const pad = n => String(n).padStart(2, '0');
const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const digitos = s => String(s).replace(/\D/g, '');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}

const demo = { pacientes: [], consultas: [], seqP: 1, seqC: 1, usuario: null,
  usuarios: [{ id: 1, login: 'admin', papel: 'ADMIN', medico: null, ativo: true }, { id: 2, login: 'medico', papel: 'MEDICO', medico: 'Dra. Camila Rocha', ativo: true }], seqU: 3 };
const ApiDemo = {
  async autenticar(login, senha) {
    await delay(400);
    if (!login || !senha) return null;
    const medico = login.trim().toLowerCase() === 'medico';
    demo.usuario = medico ? { papel: 'MEDICO', medico: 'Dra. Camila Rocha' } : { papel: 'ADMIN', medico: null };
    return { login, ...demo.usuario };
  },
  async listarPacientes() {
    await delay(60);
    const doMedico = demo.usuario?.papel === 'MEDICO';
    const meus = new Set(demo.consultas.filter(c => c.status !== 'CANCELADA' && c.medico.toLowerCase() === (demo.usuario?.medico || '').toLowerCase()).map(c => c.pacienteId));
    return demo.pacientes.filter(p => !doMedico || meus.has(p.id)).map(p => ({ ...p }));
  },
  async listarConsultas() {
    await delay(60);
    if (demo.usuario?.papel === 'MEDICO') {
      return demo.consultas.filter(c => c.status !== 'CANCELADA' && c.medico.toLowerCase() === demo.usuario.medico.toLowerCase())
        .map(({ orcamentoCentavos, ...c }) => c);
    }
    return demo.consultas.filter(c => c.status !== 'CANCELADA').map(c => ({ ...c }));
  },
  async agendarConsulta(pacienteId, medico, dataHora, orcamentoCentavos) {
    await delay(250);
    const p = demo.pacientes.find(x => x.id === pacienteId);
    if (!p) throw new ErroNegocio('Paciente não encontrado.');
    if (!medico) throw new ErroNegocio('Erro: nome do médico é obrigatório.');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dataHora) || isNaN(new Date(dataHora))) throw new ErroNegocio('Formato inválido. Informe uma data e hora válidas.');
    if (new Date(dataHora) < new Date()) throw new ErroNegocio('A data da consulta deve ser no futuro.');
    if (demo.consultas.some(c => c.status !== 'CANCELADA' && c.medico.toLowerCase() === medico.toLowerCase() && c.dataHora === dataHora)) {
      throw new ErroNegocio('Este médico já tem uma consulta neste horário.');
    }
    const c = { id: demo.seqC++, pacienteId: p.id, pacienteNome: p.nome, convenio: p.convenio, medico, dataHora, orcamentoCentavos, status: 'AGENDADA' };
    demo.consultas.push(c);
    return { ...c };
  },
  async cancelarConsulta(consultaId) {
    await delay(180);
    const consulta = demo.consultas.find(c => c.id === consultaId);
    if (!consulta) throw new ErroNegocio('Consulta não encontrada.');
    consulta.status = 'CANCELADA';
    return { ...consulta };
  },
  async atualizarOrcamento(consultaId, orcamentoCentavos) {
    await delay(180);
    const consulta = demo.consultas.find(c => c.id === consultaId);
    if (!consulta) throw new ErroNegocio('Consulta não encontrada.');
    if (orcamentoCentavos != null && (!Number.isSafeInteger(orcamentoCentavos) || orcamentoCentavos < 0)) {
      throw new ErroNegocio('Informe um orçamento válido, igual ou maior que zero.');
    }
    consulta.orcamentoCentavos = orcamentoCentavos;
    return { ...consulta };
  },
  async reagendarConsulta(consultaId, novaDataHora) {
    await delay(220);
    const c = demo.consultas.find(x => x.id === consultaId);
    if (!c) throw new ErroNegocio('Consulta não encontrada.');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(novaDataHora) || isNaN(new Date(novaDataHora))) throw new ErroNegocio('Formato inválido. Informe uma data e hora válidas.');
    if (new Date(novaDataHora) < new Date()) throw new ErroNegocio('A nova data deve ser no futuro.');
    if (demo.consultas.some(x => x.id !== consultaId && x.status !== 'CANCELADA' && x.medico.toLowerCase() === c.medico.toLowerCase() && x.dataHora === novaDataHora)) {
      throw new ErroNegocio('Este médico já tem uma consulta neste horário.');
    }
    c.dataHora = novaDataHora;
    return { ...c };
  },
  _limpar() {
    demo.pacientes = [];
    demo.consultas = [];
    demo.seqP = 1;
    demo.seqC = 1;
  },
  _semear() {
    this._limpar();
    const base = [
      ['Marina Duarte Leal', '123456789', 'Unimed'],
      ['Carlos Eduardo Pinheiro', '987654321', 'Particular'],
      ['Helena Braga Matos', '246813579', 'Bradesco Saúde'],
      ['Otávio Nascimento', '135792468', 'SulAmérica'],
      ['Beatriz Cavalcante', '112233445', 'Amil']
    ];
    base.forEach(([n, b, c]) => demo.pacientes.push({ id: demo.seqP++, nome: n, cpf: cpfCom(b), convenio: c }));
    const quando = (dias, h, m) => {
      const d = new Date();
      d.setDate(d.getDate() + dias);
      d.setHours(h, m, 0, 0);
      return isoLocal(d);
    };
    const em = min => {
      const d = new Date(Date.now() + min * 60000);
      d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
      return isoLocal(d);
    };
    [
      [1, 'Dra. Camila Rocha', em(95)],
      [2, 'Dr. Rafael Amorim', quando(1, 9, 30)],
      [3, 'Dra. Camila Rocha', quando(1, 10, 15)],
      [4, 'Dr. Rafael Amorim', quando(2, 14, 0)],
      [5, 'Dra. Camila Rocha', quando(4, 8, 45)]
    ].forEach(([pid, med, dt]) => {
      const p = demo.pacientes[pid - 1];
      demo.consultas.push({ id: demo.seqC++, pacienteId: p.id, pacienteNome: p.nome, convenio: p.convenio, medico: med, dataHora: dt, status: 'AGENDADA' });
    });
  }
};
ApiDemo._semear();

async function chamarApi(caminho, opcoes = {}) {
  let resp;
  try {
    resp = await fetch(CONFIG.BASE_URL + caminho, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opcoes
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }
  let corpo = null;
  try { corpo = await resp.json(); } catch { /* respostas sem corpo, ex.: 204 */ }
  if (!resp.ok) {
    const mensagem = corpo && (corpo.error || corpo.mensagem) ? (corpo.error || corpo.mensagem) : 'Não foi possível concluir a operação.';
    if (resp.status === 401) {
      if (caminho !== '/api/login' && sessao && aoExpirarSessao) aoExpirarSessao();
      throw new ErroSessao(mensagem);
    }
    throw new ErroNegocio(mensagem);
  }
  return corpo;
}

const consultaDoServidor = c => ({
  id: c.id,
  pacienteId: c.paciente.id,
  pacienteNome: c.paciente.nome,
  convenio: c.paciente.convenio,
  medico: c.medico,
  dataHora: c.dataHora.slice(0, 16),
  orcamentoCentavos: c.orcamentoCentavos == null ? null : c.orcamentoCentavos,
  status: c.status || 'AGENDADA'
});
const ApiHttp = {
  async autenticar(login, senha) {
    try {
      const r = await chamarApi('/api/login', { method: 'POST', body: JSON.stringify({ login, senha }) });
      return { login: r.login, papel: r.papel, medico: r.medico || null };
    } catch (e) {
      if (e instanceof ErroNegocio || e instanceof ErroSessao) return null;
      throw e;
    }
  },
  async sair() {
    try {
      await chamarApi('/api/logout', { method: 'POST' });
    } catch {
      // a sessão expira sozinha de qualquer forma
    }
  },
  async listarPacientes() {
    return chamarApi('/api/patients');
  },
  async cadastrarPaciente(nome, cpf, convenio, foto) {
    return chamarApi('/api/patients', { method: 'POST', body: JSON.stringify({ nome, cpf: digitos(cpf), convenio, foto: foto || null }) });
  },
  async atualizarPaciente(id, nome, cpf, convenio, foto) {
    return chamarApi(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify({ nome, cpf: digitos(cpf), convenio, foto: foto || null }) });
  },
  async removerPaciente(id) {
    return chamarApi(`/api/patients/${id}`, { method: 'DELETE' });
  },
  async listarConsultas() {
    const linhas = await chamarApi('/api/appointments');
    return linhas.map(consultaDoServidor);
  },
  async agendarConsulta(pacienteId, medico, dataHora, orcamentoCentavos) {
    return consultaDoServidor(await chamarApi('/api/appointments', { method: 'POST', body: JSON.stringify({ pacienteId, medico, dataHora, orcamentoCentavos }) }));
  },
  async cancelarConsulta(consultaId) {
    return consultaDoServidor(await chamarApi(`/api/appointments/${consultaId}`, { method: 'DELETE' }));
  },
  async atualizarOrcamento(consultaId, orcamentoCentavos) {
    return consultaDoServidor(await chamarApi(`/api/appointments/${consultaId}/budget`, {
      method: 'PUT', body: JSON.stringify({ orcamentoCentavos })
    }));
  },
  async listarUsuarios() {
    return chamarApi('/api/users');
  },
  async criarUsuario(login, senha, papel, medico) {
    return chamarApi('/api/users', { method: 'POST', body: JSON.stringify({ login, senha, papel, medico: medico || null }) });
  },
  async atualizarUsuario(id, dados) {
    return chamarApi(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
  },
  async removerUsuario(id) {
    return chamarApi(`/api/users/${id}`, { method: 'DELETE' });
  },
  async reagendarConsulta(consultaId, novaDataHora) {
    return consultaDoServidor(await chamarApi(`/api/appointments/${consultaId}`, { method: 'PUT', body: JSON.stringify({ dataHora: novaDataHora }) }));
  }
};
const Api = CONFIG.MODO === 'api' ? ApiHttp : ApiDemo;

const fmtCpf = d => `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
const mascaraCpf = d => `${d.slice(0,3)}.•••.•••-${d.slice(9,11)}`;
const fmtParcial = d => { let s = d.slice(0,3); if (d.length>3) s += '.'+d.slice(3,6); if (d.length>6) s += '.'+d.slice(6,9); if (d.length>9) s += '-'+d.slice(9,11); return s; };
const fmtDiaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDinheiroCentavos = centavos => fmtDinheiro.format(centavos / 100);
const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const fmtMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const inicioDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diffDias = (a, b) => Math.round((inicioDia(a) - inicioDia(b)) / 86400000);
const ordenar = arr => [...arr].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
function quando(dt) {
  const min = Math.round((dt - new Date()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `em ${min} min`;
  const dias = diffDias(dt, new Date());
  if (dias === 0) return `hoje, em ${Math.round(min / 60)} h`;
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

const VIEWS = {
  inicio:    { titulo: () => `Bem-vindo, ${ehAdmin() ? sessao.login : (sessao.medico || sessao.login)}!`, sub: () => cap(fmtDiaLongo.format(new Date())), acao: { txt: 'Agendar consulta', admin: true, fazer: () => ir('consultas') } },
  pacientes: { titulo: () => 'Pacientes', sub: () => ehAdmin() ? 'Cadastre e consulte quem é atendido na clínica.' : 'Pacientes que você atende.', acao: { txt: 'Novo paciente', admin: true, fazer: () => abrirDialogo() } },
  consultas: { titulo: () => ehAdmin() ? 'Consultas' : 'Minha agenda', sub: () => ehAdmin() ? 'Agende por médico, data e hora e acompanhe a agenda.' : 'Seus atendimentos, por dia e horário.', acao: { txt: 'Agendar consulta', admin: true, fazer: () => ir('consultas') } },
  usuarios:  { titulo: () => 'Usuários', sub: () => 'Crie e gerencie os acessos de administradores e médicos.', acao: { txt: 'Novo usuário', admin: true, fazer: () => abrirUsuario() } }
};
const acaoDaView = v => { const a = VIEWS[v].acao; return a && (!a.admin || ehAdmin()) ? a : null; };
function ir(v) {
  if (v === 'usuarios' && !ehAdmin()) v = 'inicio';
  viewAtual = v;
  $$('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
  $$('.nav-btn[data-view]').forEach(b => b.hasAttribute('data-view') && (b.dataset.view === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const cfg = VIEWS[v];
  $('#titulo').textContent = cfg.titulo(); $('#subtitulo').textContent = cfg.sub();
  const acao = acaoDaView(v), b = $('#top-acao'); b.hidden = !acao; if (acao) b.lastElementChild.textContent = acao.txt;
  $('#main').scrollTop = 0; $('#titulo').focus({ preventScroll: true });
  if (v === 'consultas') prepararFormConsulta();
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, um, varios) => n === 1 ? um : varios;
const semAcento = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const inicial = s => (s.trim()[0] || '?').toUpperCase();
function setMsg(el, txt, tipo = 'erro') { el.textContent = txt || ''; el.dataset.tipo = tipo; }
let toastT;
function toast(txt) { const t = $('#toast'); t.textContent = txt; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3800); }

class ErroNegocio extends Error {}
class ErroSessao extends Error {}

async function carregar() {
  try { [pacientes, consultas, usuarios] = await Promise.all([Api.listarPacientes(), Api.listarConsultas(), ehAdmin() ? Api.listarUsuarios() : []]); }
  catch (err) { if (!(err instanceof ErroSessao)) toast('Não foi possível carregar os dados. Tente novamente.'); return; }
  renderInicio(); renderPacientes(); renderUsuarios(); renderAgenda($('#consultas-agenda'), ordenar(consultas), 'Nenhuma consulta agendada.'); prepararFormConsulta();
}

function renderInicio() {
  const agora = new Date();
  const futuras = ordenar(consultas).filter(c => new Date(c.dataHora) >= agora);
  const prox = futuras[0], corpo = $('#proxima-corpo');
  if (!prox) {
    const temPac = pacientes.length > 0;
    corpo.replaceChildren(...[
      h('p', { class: 'rotulo', text: 'Próxima consulta' }),
      h('p', { class: 'vazio-titulo', text: 'Agenda livre por enquanto.' }),
      h('p', { class: 'vazio-txt', text: !ehAdmin() ? 'Você não tem consultas agendadas no momento.' : temPac ? 'Nenhuma consulta agendada. Escolha um paciente e marque o primeiro horário.' : 'Cadastre o primeiro paciente para liberar o agendamento.' }),
      ehAdmin() && h('button', { class: 'btn accent', type: 'button', onclick: () => temPac ? ir('consultas') : abrirDialogo() }, temPac ? 'Agendar consulta' : 'Cadastrar paciente')
    ].filter(Boolean));
  } else {
    const d = new Date(prox.dataHora);
    corpo.replaceChildren(
      h('p', { class: 'rotulo', text: `Próxima consulta, ${quando(d)}` }),
      h('p', { class: 'hora-grande', text: fmtHora.format(d) }),
      h('p', { class: 'data-longa', text: cap(fmtDiaLongo.format(d)) }),
      h('p', { class: 'quem-grande', text: prox.pacienteNome }),
      h('p', { class: 'medico-claro', text: 'com ' + prox.medico })
    );
  }
  const hoje = futuras.filter(c => diffDias(new Date(c.dataHora), agora) === 0).length;
  const linha = (n, um, varios) => h('div', {}, h('b', { text: String(n) }), h('span', { text: plural(n, um, varios) }));
  $('#resumo').replaceChildren(
    ehAdmin() ? linha(pacientes.length, 'paciente cadastrado', 'pacientes cadastrados') : linha(pacientes.length, 'paciente atendido', 'pacientes atendidos'),
    linha(consultas.length, 'consulta agendada', 'consultas agendadas'),
    linha(hoje, 'consulta hoje', 'consultas hoje')
  );
  renderAgenda($('#inicio-agenda'), futuras.slice(0, 6), ehAdmin() ? 'Nenhum atendimento à vista. Que tal agendar uma consulta?' : 'Nenhum atendimento à vista.');
}

function renderAgenda(el, lista, vazioMsg) {
  if (!lista.length) { el.replaceChildren(h('p', { class: 'vazio-inline', text: vazioMsg })); return; }
  const grupos = new Map(), agora = new Date();
  for (const c of lista) { const k = c.dataHora.slice(0, 10); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(c); }
  el.replaceChildren(...[...grupos].map(([k, itens]) => {
    const d = new Date(k + 'T00:00'), dd = diffDias(d, agora);
    const rotulo = dd === 0 ? 'Hoje' : dd === 1 ? 'Amanhã' : cap(fmtSemana.format(d));
    return h('div', { class: 'dia' + (dd === 0 ? ' hoje' : '') },
      h('div', { class: 'dia-marca' }, String(d.getDate()), h('small', { text: rotulo }), h('small', { text: fmtMes.format(d) })),
      h('div', {}, itens.map(c => {
        const dt = new Date(c.dataHora), passada = dt < agora;
        return h('div', { class: 'consulta' + (passada ? ' passada' : '') },
          h('span', { class: 'hora', text: fmtHora.format(dt) }),
          h('div', {}, h('div', { class: 'quem', text: c.pacienteNome }), h('div', { class: 'medico', text: 'com ' + c.medico })),
          h('div', { class: 'consulta-acoes' },
            h('span', { class: 'chip', text: c.convenio }),
            ehAdmin() && h('span', { class: 'chip orcamento-chip', text: c.orcamentoCentavos == null ? 'Sem orçamento' : fmtDinheiroCentavos(c.orcamentoCentavos) }),
            ehAdmin() && h('button', { class: 'btn ghost consulta-orcamento', type: 'button',
              text: c.orcamentoCentavos == null ? 'Definir orçamento' : 'Editar orçamento',
              'aria-label': `${c.orcamentoCentavos == null ? 'Definir' : 'Editar'} orçamento da consulta de ${c.pacienteNome}`,
              onclick: () => abrirOrcamento(c) }),
            ehAdmin() && h('button', { class: 'btn ghost danger consulta-cancelar', type: 'button', text: 'Cancelar',
              'aria-label': `Cancelar consulta de ${c.pacienteNome}`,
              onclick: () => cancelarConsulta(c) }),
            ehAdmin() && h('button', { class: 'icon-btn sm', type: 'button', disabled: passada,
              'aria-label': passada ? `Consulta de ${c.pacienteNome} já ocorreu` : `Reagendar consulta de ${c.pacienteNome}`,
              onclick: () => abrirReagendar(c) }, icon('reagendar', 17))));
      })));
  }));
}

async function cancelarConsulta(c) {
  if (!confirm(`Cancelar a consulta de ${c.pacienteNome} com ${c.medico}?`)) return;
  try {
    await Api.cancelarConsulta(c.id);
    await carregar();
    toast(`Consulta cancelada: ${c.pacienteNome}`);
  } catch (err) {
    toast(err instanceof ErroNegocio ? err.message : 'Não foi possível cancelar a consulta.');
  }
}

const formLogin = $('#login-form'), inLogin = $('#login'), inSenha = $('#senha'), msgLogin = $('#login-msg'), btnLogin = $('#login-btn');
let falhas = 0, bloqueioTimer = null;

$('#pw-toggle').addEventListener('click', e => {
  const btn = e.currentTarget, mostrar = inSenha.type === 'password';
  inSenha.type = mostrar ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(mostrar));
  btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  btn.replaceChildren(icon(mostrar ? 'eyeoff' : 'eye'));
});

function bloquear() {
  let resta = CONFIG.BLOQUEIO_S;
  btnLogin.disabled = true;
  const tick = () => {
    if (resta <= 0) { clearInterval(bloqueioTimer); btnLogin.disabled = false; falhas = 0; setMsg(msgLogin, ''); return; }
    setMsg(msgLogin, `Muitas tentativas. Tente de novo em ${resta} s.`); resta--;
  };
  clearInterval(bloqueioTimer); tick(); bloqueioTimer = setInterval(tick, 1000);
}

formLogin.addEventListener('submit', async e => {
  e.preventDefault();
  if (btnLogin.disabled) return;
  const login = inLogin.value.trim(), senha = inSenha.value;
  inLogin.removeAttribute('aria-invalid'); inSenha.removeAttribute('aria-invalid');
  if (!login || !senha.trim()) {
    setMsg(msgLogin, 'Login e senha são obrigatórios.');
    (!login ? inLogin : inSenha).setAttribute('aria-invalid', 'true'); (!login ? inLogin : inSenha).focus();
    return;
  }
  setMsg(msgLogin, ''); btnLogin.disabled = true; btnLogin.textContent = 'Entrando…';
  let usuario = null, erroRede = false;
  try { usuario = await Api.autenticar(login, senha); } catch { erroRede = true; }
  inSenha.value = '';
  btnLogin.textContent = 'Entrar'; btnLogin.disabled = false;
  if (erroRede) { setMsg(msgLogin, 'Não foi possível conectar ao servidor. Tente novamente.'); return; }
  if (!usuario) {
    falhas++;
    if (falhas >= CONFIG.MAX_TENTATIVAS) bloquear();
    else setMsg(msgLogin, 'Login ou senha inválidos.');
    inSenha.focus(); return;
  }
  falhas = 0; inLogin.value = '';
  entrar(usuario);
});

async function entrar(usuario) {
  sessao = { login: usuario.login, papel: usuario.papel || 'ADMIN', medico: usuario.medico || null };
  $('#login-view').hidden = true; $('#app-view').hidden = false;
  $('#user-login').textContent = sessao.login;
  $('#user-papel').textContent = ehAdmin() ? 'Administrador' : 'Médico';
  $('#user-avatar').textContent = inicial(sessao.login);
  $('#nav-usuarios').hidden = !ehAdmin();
  $('#painel-agendar').hidden = !ehAdmin();
  $('#consultas-grid').classList.toggle('so-agenda', !ehAdmin());
  $('#demo-tag').hidden = CONFIG.MODO !== 'demo';
  await carregar();
  ir('inicio');
  armarInatividade();
}

function sair(aviso) {
  if (CONFIG.MODO === 'api' && sessao) Api.sair();
  clearTimeout(inatividade); sessao = null; pacientes = []; consultas = []; usuarios = [];
  $$('dialog[open]').forEach(d => d.close());
  ['#proxima-corpo', '#resumo', '#inicio-agenda', '#pacientes-area', '#consultas-agenda', '#usuarios-area'].forEach(s => $(s).replaceChildren());
  $('#form-consulta').reset(); $('#form-paciente').reset(); $('#form-reagendar').reset(); $('#busca').value = ''; resetarFoto();
  $('#app-view').hidden = true; $('#login-view').hidden = false;
  setMsg(msgLogin, aviso || '', 'info');
  inLogin.focus();
}
$('#btn-sair').addEventListener('click', () => sair('Você saiu com segurança.'));

let inatividade;
function armarInatividade() {
  clearTimeout(inatividade);
  if (!sessao) return;
  inatividade = setTimeout(() => sair('Sessão encerrada por inatividade. Entre novamente.'), CONFIG.INATIVIDADE_MS);
}
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, armarInatividade, { passive: true, capture: true }));
aioExpirarSessao = () => sair('Sessão expirada. Entre novamente.');

$('#demo-note').hidden = CONFIG.MODO !== 'demo';
inLogin.focus();
})();

