(() => {
  'use strict';

  const formUsuario = document.getElementById('form-usuario');
  const msgUsuario = document.getElementById('msg-usuario');
  const papel = document.getElementById('u-papel');
  const campoMedico = document.getElementById('u-medico-campo');
  const listaUsuarios = document.getElementById('usuarios-area');

  function syncUsuarioField(field) {
    if (!field) return;

    const invalid = field.value && !field.checkValidity();
    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
      const ids = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      if (msgUsuario && !ids.has(msgUsuario.id)) {
        ids.add(msgUsuario.id);
        field.setAttribute('aria-describedby', [...ids].join(' '));
      }
    } else {
      field.removeAttribute('aria-invalid');
      if (field.getAttribute('aria-describedby')) {
        const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).filter(id => id !== msgUsuario?.id);
        field.setAttribute('aria-describedby', ids.join(' '));
      }
    }
  }

  if (formUsuario) {
    const fields = [...formUsuario.querySelectorAll('input, select')];

    fields.forEach(field => {
      field.addEventListener('input', () => syncUsuarioField(field));
      field.addEventListener('change', () => syncUsuarioField(field));
      field.addEventListener('blur', () => syncUsuarioField(field));
    });

    formUsuario.addEventListener('submit', () => {
      requestAnimationFrame(() => {
        fields.forEach(field => syncUsuarioField(field));
      });
    });
  }

  if (papel && campoMedico) {
    const atualizarCampoMedico = () => {
      const visivel = papel.value === 'MEDICO';
      campoMedico.hidden = !visivel;
      campoMedico.setAttribute('aria-hidden', String(!visivel));
      if (visivel) {
        const input = document.getElementById('u-medico');
        if (input) {
          input.setAttribute('aria-required', 'true');
          input.required = true;
        }
      } else {
        const input = document.getElementById('u-medico');
        if (input) {
          input.removeAttribute('aria-required');
          input.required = false;
        }
      }
    };

    papel.addEventListener('change', atualizarCampoMedico);
    atualizarCampoMedico();
  }

  if (listaUsuarios) {
    listaUsuarios.setAttribute('role', 'list');
    listaUsuarios.querySelectorAll(':scope > *').forEach(item => item.setAttribute('role', 'listitem'));

    const cards = listaUsuarios.querySelectorAll('.usuario-card, .usuario-item, li, [data-login]');
    cards.forEach(card => {
      card.setAttribute('role', 'listitem');
      if (!card.getAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }
    });
  }

  const dialogs = document.querySelectorAll('dialog');
  dialogs.forEach(dialog => {
    dialog.addEventListener('close', () => {
      const focoAtual = document.activeElement;
      if (focoAtual && focoAtual instanceof HTMLElement && focoAtual.closest('dialog')) {
        focoAtual.blur();
      }
    });
  });
})();
