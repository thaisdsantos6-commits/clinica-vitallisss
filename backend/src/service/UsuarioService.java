package service;

import java.util.List;
import java.util.regex.Pattern;
import model.Usuario;
import repository.UsuarioRepository;
import util.DatabaseException;
import util.Seguranca;

/** Gestão de usuários (somente administrador). Toda validação é feita aqui, independentemente do front-end. */
public class UsuarioService {
    public static final int LOGIN_MIN = 3;
    public static final int SENHA_MIN = 8;
    public static final int MEDICO_MAX = AgendaService.MEDICO_MAX;

    private static final Pattern LOGIN_VALIDO = Pattern.compile("[\\p{L}\\p{N}._@-]{" + LOGIN_MIN + "," + AutenticacaoService.LOGIN_MAX + "}");

    private final UsuarioRepository repository;
    private final AutenticacaoService autenticacao;

    public UsuarioService(UsuarioRepository repository, AutenticacaoService autenticacao) {
        this.repository = repository;
        this.autenticacao = autenticacao;
    }

    public synchronized List<Usuario> listar() {
        return repository.listar();
    }

    public synchronized Usuario criar(String login, String senha, String papel, String medico) {
        login = login == null ? "" : login.strip();
        if (!LOGIN_VALIDO.matcher(login).matches()) {
            throw new IllegalArgumentException("O login deve ter de " + LOGIN_MIN + " a " + AutenticacaoService.LOGIN_MAX
                    + " caracteres, usando letras, números, ponto, hífen, sublinhado ou @.");
        }
        validarSenha(senha);
        papel = papel == null ? "" : papel.strip().toUpperCase();
        if (!Usuario.papelValido(papel)) {
            throw new IllegalArgumentException("Perfil inválido. Escolha Administrador, Médico ou Recepção.");
        }
        medico = Usuario.MEDICO.equals(papel) ? validarMedico(medico) : null;

        if (repository.buscarPorLogin(login) != null) {
            throw new IllegalArgumentException("Já existe um usuário com este login.");
        }
        try {
            return repository.salvar(login, Seguranca.gerarHash(senha), papel, medico);
        } catch (DatabaseException e) {
            if ("23505".equals(e.getSqlState())) {
                throw new IllegalArgumentException("Já existe um usuário com este login.", e);
            }
            throw e;
        }
    }

    /**
     * Atualiza um usuário. Campos nulos (senha, medico, ativo) permanecem como estão.
     * O login e o perfil não mudam. Retorna null se o usuário não existir.
     */
    public synchronized Usuario atualizar(int id, int solicitanteId, String medico, String novaSenha, Boolean ativo) {
        Usuario atual = repository.buscarPorId(id);
        if (atual == null) return null;

        if (id == solicitanteId && Boolean.FALSE.equals(ativo)) {
            throw new IllegalArgumentException("Você não pode desativar o seu próprio usuário.");
        }

        String novoMedico = atual.getMedico();
        if (atual.isMedico() && medico != null) novoMedico = validarMedico(medico);
        boolean novoAtivo = ativo != null ? ativo : atual.isAtivo();

        boolean trocarSenha = novaSenha != null && !novaSenha.isEmpty();
        if (trocarSenha) validarSenha(novaSenha);

        Usuario atualizado = repository.atualizar(id, novoMedico, novoAtivo);
        if (atualizado == null) return null;
        if (trocarSenha) repository.atualizarSenha(id, Seguranca.gerarHash(novaSenha));
        if (!novoAtivo || trocarSenha) autenticacao.encerrarSessoesDoUsuario(id);
        return atualizado;
    }

    /** Retorna false se o usuário não existir. */
    public synchronized boolean remover(int id, int solicitanteId) {
        if (id == solicitanteId) {
            throw new IllegalArgumentException("Você não pode excluir o seu próprio usuário.");
        }
        boolean removido = repository.remover(id);
        if (removido) autenticacao.encerrarSessoesDoUsuario(id);
        return removido;
    }

    // ------------------------------------------------------------ validações

    private static void validarSenha(String senha) {
        if (senha == null || senha.isBlank()) throw new IllegalArgumentException("A senha é obrigatória.");
        if (senha.length() < SENHA_MIN) {
            throw new IllegalArgumentException("A senha deve ter pelo menos " + SENHA_MIN + " caracteres.");
        }
        if (senha.length() > AutenticacaoService.SENHA_MAX) {
            throw new IllegalArgumentException("A senha deve ter no máximo " + AutenticacaoService.SENHA_MAX + " caracteres.");
        }
    }

    private static String validarMedico(String medico) {
        medico = medico == null ? "" : medico.strip();
        if (medico.isEmpty()) {
            throw new IllegalArgumentException("Informe o nome do médico exatamente como aparece na agenda.");
        }
        if (medico.length() > MEDICO_MAX) {
            throw new IllegalArgumentException("O nome do médico deve ter no máximo " + MEDICO_MAX + " caracteres.");
        }
        if (medico.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("O nome do médico não pode conter caracteres de controle.");
        }
        return medico;
    }
}
