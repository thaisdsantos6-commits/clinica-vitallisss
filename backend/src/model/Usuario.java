package model;

public class Usuario {
    public static final String ADMIN = "ADMIN";
    public static final String MEDICO = "MEDICO";
    public static final String RECEPCAO = "RECEPCAO";

    private final int id;
    private final String login;
    private final String senhaHash;
    private final String papel;
    private final String medico;     // nome do médico na agenda (só para o perfil MEDICO)
    private final boolean ativo;

    public Usuario(int id, String login, String senhaHash, String papel, String medico, boolean ativo) {
        this.id = id;
        this.login = login;
        this.senhaHash = senhaHash;
        this.papel = papel;
        this.medico = medico;
        this.ativo = ativo;
    }

    public int getId() { return id; }
    public String getLogin() { return login; }
    public String getSenhaHash() { return senhaHash; }
    public String getPapel() { return papel; }
    public String getMedico() { return medico; }
    public boolean isAtivo() { return ativo; }

    public boolean isAdmin() { return ADMIN.equals(papel); }
    public boolean isMedico() { return MEDICO.equals(papel); }
    public boolean isRecepcao() { return RECEPCAO.equals(papel); }

    public static boolean papelValido(String papel) {
        return ADMIN.equals(papel) || MEDICO.equals(papel) || RECEPCAO.equals(papel);
    }

    // ---- Permissões: único lugar que decide o que cada perfil pode fazer (o servidor aplica; o front só espelha) ----
    // Administrador: tudo. Recepção: atendimento (pacientes e agenda), sem orçamento, sem exclusão e sem usuários.
    // Médico: somente consulta da própria agenda e dos pacientes que atende, sem orçamento.
    public boolean podeVerTodosPacientes()  { return isAdmin() || isRecepcao(); }
    public boolean podeGerenciarPacientes() { return isAdmin() || isRecepcao(); }   // cadastrar e editar
    public boolean podeExcluirPacientes()   { return isAdmin(); }
    public boolean podeVerTodaAgenda()      { return isAdmin() || isRecepcao(); }
    public boolean podeAgendar()            { return isAdmin() || isRecepcao(); }   // agendar e reagendar
    public boolean podeVerOrcamento()       { return isAdmin(); }                   // ver e definir
    public boolean podeGerenciarUsuarios()  { return isAdmin(); }
}
