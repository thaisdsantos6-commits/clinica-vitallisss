package service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import model.Consulta;
import model.Paciente;
import repository.ConsultaRepository;
import util.DatabaseException;

/** Regras de negócio da agenda de consultas. Toda validação é feita aqui, independentemente do front-end. */
public class AgendaService {
    public static final int MEDICO_MAX = 80;
    public static final int ANO_MAXIMO_AGENDAMENTO = 2027;

    private final ConsultaRepository repository;

    public AgendaService() {
        this(new ConsultaRepository());
    }

    public AgendaService(ConsultaRepository repository) {
        this.repository = repository;
    }

    public synchronized Consulta agendar(Paciente paciente, String medico, LocalDateTime dataHora) {
        return agendar(paciente, medico, dataHora, null);
    }

    public synchronized Consulta agendar(Paciente paciente, String medico, LocalDateTime dataHora, Long orcamentoCentavos) {
        if (paciente == null) throw new IllegalArgumentException("Paciente inválido.");
        medico = validarMedico(medico);
        dataHora = validarDataFutura(dataHora, "A data da consulta deve ser no futuro.");
        validarHorarioLivre(medico, dataHora, -1);
        validarOrcamento(orcamentoCentavos);

        Consulta consulta = new Consulta(0, paciente, medico, dataHora);
        consulta.setOrcamentoCentavos(orcamentoCentavos);
        try {
            return repository.salvar(consulta);
        } catch (DatabaseException e) {
            if ("23505".equals(e.getSqlState())) {
                throw new IllegalArgumentException("Este médico já tem uma consulta neste horário.", e);
            }
            throw e;
        }
    }

    /** Muda a data/hora de uma consulta. Retorna null se a consulta não existir. */
    public synchronized Consulta reagendar(int id, LocalDateTime novaDataHora) {
        Consulta consulta = buscarPorId(id);
        if (consulta == null) return null;
        if (consulta.isCancelada()) {
            throw new IllegalArgumentException("Esta consulta foi cancelada e não pode ser reagendada. Agende uma nova consulta.");
        }

        novaDataHora = validarDataFutura(novaDataHora, "A nova data deve ser no futuro.");
        validarHorarioLivre(consulta.getMedico(), novaDataHora, id);
        try {
            return repository.reagendar(id, novaDataHora);
        } catch (DatabaseException e) {
            if ("23505".equals(e.getSqlState())) {
                throw new IllegalArgumentException("Este médico já tem uma consulta neste horário.", e);
            }
            throw e;
        }
    }

    /**
     * Cancela uma consulta futura. O registro continua no banco com status CANCELADA
     * (histórico) e o horário do médico fica livre. Retorna null se a consulta não existir.
     */
    public synchronized Consulta cancelar(int id) {
        Consulta consulta = buscarPorId(id);
        if (consulta == null) return null;
        if (consulta.isCancelada()) throw new IllegalArgumentException("Esta consulta já está cancelada.");
        if (consulta.getDataHora().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Não é possível cancelar uma consulta que já ocorreu.");
        }
        return repository.cancelar(id);
    }

    /** Atualiza ou remove o orçamento de uma consulta. Retorna null se a consulta não existir. */
    public synchronized Consulta atualizarOrcamento(int id, Long orcamentoCentavos) {
        if (buscarPorId(id) == null) return null;
        validarOrcamento(orcamentoCentavos);
        return repository.atualizarOrcamento(id, orcamentoCentavos);
    }

    public synchronized Consulta buscarPorId(int id) {
        return repository.buscarPorId(id);
    }

    public synchronized List<Consulta> listarPorMedico(String medico) {
        return repository.listarPorMedico(medico);
    }

    public synchronized List<Consulta> listarTodas() {
        return repository.listarTodas();
    }

    /** Remove as consultas de um paciente (usado quando o paciente é excluído). */
    public synchronized int removerPorPaciente(int pacienteId) {
        return repository.removerPorPaciente(pacienteId);
    }

    // ------------------------------------------------------------ validações

    private static void validarOrcamento(Long orcamentoCentavos) {
        if (orcamentoCentavos != null && orcamentoCentavos < 0) {
            throw new IllegalArgumentException("O orçamento deve ser igual ou maior que zero.");
        }
    }

    private static String validarMedico(String medico) {
        medico = medico == null ? "" : medico.strip();
        if (medico.isEmpty()) throw new IllegalArgumentException("Nome do médico é obrigatório.");
        if (medico.length() > MEDICO_MAX) {
            throw new IllegalArgumentException("O nome do médico deve ter no máximo " + MEDICO_MAX + " caracteres.");
        }
        if (medico.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("O nome do médico não pode conter caracteres de controle.");
        }
        return medico;
    }

    /** Exige data/hora informada e no futuro, limitada ao ano de 2027. Trunca para minutos. */
    private static LocalDateTime validarDataFutura(LocalDateTime dataHora, String mensagem) {
        if (dataHora == null) throw new IllegalArgumentException("Informe a data e a hora da consulta.");
        if (dataHora.isBefore(LocalDateTime.now())) throw new IllegalArgumentException(mensagem);
        if (dataHora.getYear() > ANO_MAXIMO_AGENDAMENTO) {
            throw new IllegalArgumentException("Só é possível agendar consultas até 31/12/2027.");
        }
        return dataHora.truncatedTo(ChronoUnit.MINUTES);
    }

    /** Um médico não pode ter duas consultas no mesmo horário (ignora a consulta "ignorarId"). */
    private void validarHorarioLivre(String medico, LocalDateTime dataHora, int ignorarId) {
        if (repository.existeHorario(medico, dataHora, ignorarId)) {
            throw new IllegalArgumentException("Este médico já tem uma consulta neste horário.");
        }
    }
}
