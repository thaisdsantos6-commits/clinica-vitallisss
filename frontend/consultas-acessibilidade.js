/* Cancelamento de consultas — extensão carregada pelo index.html. */
(() => {
  'use strict';

  const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();
  const dataVisivel = elemento => {
    const marca = elemento.closest('.dia')?.querySelector('.dia-marca');
    if (!marca) return null;
    const dia = Number(marca.childNodes[0]?.textContent?.trim());
    const pequenos = marca.querySelectorAll('small');
    const mes = normalizar(pequenos[1]?.textContent || '');
    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const indiceMes = meses.indexOf(mes);
    if (!dia || indiceMes < 0) return null;
    return { dia, mes: indiceMes };
  };

  function inserirBotoes() {
    document.querySelectorAll('.consulta').forEach(item => {
      const acoes = item.querySelector('.consulta-acoes');
      // O botão de reagendar só existe para administradores.
      if (!acoes || !acoes.querySelector('.icon-btn[aria-label*="Reagendar"]') || acoes.querySelector('[data-cancelar-consulta]')) return;
      const passada = item.classList.contains('passada');
      const paciente = item.querySelector('.quem')?.textContent?.trim() || '';
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'btn ghost danger consulta-cancelar';
      botao.textContent = 'Cancelar consulta';
      botao.dataset.cancelarConsulta = 'true';
      botao.disabled = passada;
      botao.setAttribute('aria-label', passada ? `Consulta de ${paciente} já ocorreu` : `Cancelar consulta de ${paciente}`);
      acoes.append(botao);
    });
  }

  async function cancelar(botao) {
    const item = botao.closest('.consulta');
    const pacienteNome = item?.querySelector('.quem')?.textContent?.trim() || 'este paciente';
    const medicoTexto = item?.querySelector('.medico')?.textContent?.trim() || '';
    const medico = medicoTexto.replace(/^com\s+/i, '').trim();
    const hora = item?.querySelector('.hora')?.textContent?.trim() || '';
    const data = dataVisivel(item);
    if (!item || !data || !hora || !medico) return alert('Não foi possível identificar esta consulta. Atualize a página e tente novamente.');
    if (!window.confirm(`Tem certeza que deseja cancelar a consulta de ${pacienteNome}?`)) return;

    botao.disabled = true;
    try {
      const resposta = await fetch('/api/appointments', { credentials: 'same-origin' });
      if (!resposta.ok) throw new Error('Não foi possível carregar a agenda.');
      const consultas = await resposta.json();
      const candidatos = consultas.filter(c => {
        const d = new Date(c.dataHora);
        return c.paciente?.nome === pacienteNome && c.medico === medico
          && d.getDate() === data.dia && d.getMonth() === data.mes
          && new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d) === hora;
      });
      if (candidatos.length !== 1) throw new Error('Não foi possível localizar uma consulta única. Atualize a página e tente novamente.');

      const exclusao = await fetch(`/api/appointments/${candidatos[0].id}`, {
        method: 'DELETE', credentials: 'same-origin'
      });
      if (!exclusao.ok) {
        let mensagem = 'Não foi possível cancelar a consulta.';
        try { mensagem = (await exclusao.json()).error || mensagem; } catch { /* resposta sem JSON */ }
        throw new Error(mensagem);
      }

      // Remove a consulta das agendas exibidas sem perder a sessão do usuário.
      document.querySelectorAll('.consulta').forEach(linha => {
        if (linha.querySelector('.quem')?.textContent?.trim() === pacienteNome
            && linha.querySelector('.medico')?.textContent?.trim() === medicoTexto
            && linha.querySelector('.hora')?.textContent?.trim() === hora
            && dataVisivel(linha)?.dia === data.dia && dataVisivel(linha)?.mes === data.mes) {
          const dia = linha.closest('.dia');
          linha.remove();
          if (dia && !dia.querySelector('.consulta')) dia.remove();
        }
      });
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = `Consulta cancelada: ${pacienteNome}`;
        toast.classList.add('on');
        window.setTimeout(() => toast.classList.remove('on'), 3800);
      }
    } catch (erro) {
      alert(erro.message || 'Não foi possível cancelar a consulta. Tente novamente.');
      botao.disabled = false;
    }
  }

  document.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-cancelar-consulta]');
    if (botao) cancelar(botao);
  });
  new MutationObserver(inserirBotoes).observe(document.body, { childList: true, subtree: true });
  inserirBotoes();
})();
