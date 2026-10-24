package controller;

import java.util.List;
import model.Paciente;
import service.PacienteService;

/**
 * Ponte entre a camada HTTP (ApiServer) e as regras de negócio de pacientes.
 * Mantém a regra de que excluir um paciente também remove as consultas dele.
 */
public class PacienteController {
    private final PacienteService pacienteService;

    public PacienteController(PacienteService pacienteService) {
        this.pacienteService = pacienteService;
    }

    public List<Paciente> listar() {
        return pacienteService.listarTodos();
    }

    public Paciente buscarPorId(int id) {
        return pacienteService.buscarPorId(id);
    }

    public Paciente cadastrar(String nome, String cpf, String convenio, String foto) {
        return pacienteService.cadastrar(nome, cpf, convenio, foto);
    }

    public Paciente atualizar(int id, String nome, String cpf, String convenio, String foto) {
        return pacienteService.atualizar(id, nome, cpf, convenio, foto);
    }

    /** Retorna false se o paciente não existir. */
    public boolean remover(int id) {
        return pacienteService.remover(id);
    }
}
