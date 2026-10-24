package repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import model.Consulta;
import model.Paciente;
import util.Database;
import util.DatabaseException;

public class ConsultaRepository {
    private static final String SELECT_CONSULTA = "SELECT c.id, c.medico, c.data_hora, c.status, "
            + "c.orcamento_centavos, p.id AS paciente_id, p.nome, p.cpf, p.convenio, p.foto, p.historico "
            + "FROM consultas c JOIN pacientes p ON p.id = c.paciente_id ";

    public Consulta salvar(Consulta consulta) {
        String sql = "INSERT INTO consultas (paciente_id, medico, data_hora, status, orcamento_centavos) "
                + "VALUES (?, ?, ?, ?, ?) RETURNING id";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setInt(1, consulta.getPaciente().getId());
            statement.setString(2, consulta.getMedico());
            statement.setTimestamp(3, Timestamp.valueOf(consulta.getDataHora()));
            statement.setString(4, consulta.getStatus());
            if (consulta.getOrcamentoCentavos() == null) statement.setNull(5, java.sql.Types.BIGINT);
            else statement.setLong(5, consulta.getOrcamentoCentavos());

            try (ResultSet resultado = statement.executeQuery()) {
                if (!resultado.next()) throw new SQLException("O PostgreSQL não retornou o ID da consulta.");
                Consulta salva = new Consulta(resultado.getInt("id"), consulta.getPaciente(),
                        consulta.getMedico(), consulta.getDataHora());
                salva.setStatus(consulta.getStatus());
                salva.setOrcamentoCentavos(consulta.getOrcamentoCentavos());
                return salva;
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível salvar a consulta.", e);
        }
    }

    public Consulta buscarPorId(int id) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(SELECT_CONSULTA + "WHERE c.id = ?")) {
            statement.setInt(1, id);
            try (ResultSet resultado = statement.executeQuery()) {
                return resultado.next() ? mapear(resultado) : null;
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível buscar a consulta.", e);
        }
    }

    public List<Consulta> listarTodas() {
        List<Consulta> consultas = new ArrayList<>();
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(SELECT_CONSULTA + "ORDER BY c.id");
             ResultSet resultado = statement.executeQuery()) {
            while (resultado.next()) consultas.add(mapear(resultado));
            return consultas;
        } catch (SQLException e) {
            throw erroBanco("Não foi possível listar as consultas.", e);
        }
    }

    public List<Consulta> listarPorMedico(String medico) {
        List<Consulta> consultas = new ArrayList<>();
        String sql = SELECT_CONSULTA
                + "WHERE c.status = 'AGENDADA' AND LOWER(c.medico) = LOWER(?) ORDER BY c.id";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setString(1, medico);
            try (ResultSet resultado = statement.executeQuery()) {
                while (resultado.next()) consultas.add(mapear(resultado));
                return consultas;
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível listar as consultas do médico.", e);
        }
    }

    public Consulta reagendar(int id, LocalDateTime dataHora) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(
                     "UPDATE consultas SET data_hora = ? WHERE id = ?")) {
            statement.setTimestamp(1, Timestamp.valueOf(dataHora));
            statement.setInt(2, id);
            if (statement.executeUpdate() == 0) return null;
            return buscarPorId(id);
        } catch (SQLException e) {
            throw erroBanco("Não foi possível reagendar a consulta.", e);
        }
    }

    public Consulta atualizarOrcamento(int id, Long orcamentoCentavos) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(
                     "UPDATE consultas SET orcamento_centavos = ? WHERE id = ?")) {
            if (orcamentoCentavos == null) statement.setNull(1, java.sql.Types.BIGINT);
            else statement.setLong(1, orcamentoCentavos);
            statement.setInt(2, id);
            if (statement.executeUpdate() == 0) return null;
            return buscarPorId(id);
        } catch (SQLException e) {
            throw erroBanco("Não foi possível atualizar o orçamento da consulta.", e);
        }
    }

    public int removerPorPaciente(int pacienteId) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(
                     "DELETE FROM consultas WHERE paciente_id = ?")) {
            statement.setInt(1, pacienteId);
            return statement.executeUpdate();
        } catch (SQLException e) {
            throw erroBanco("Não foi possível excluir as consultas do paciente.", e);
        }
    }

    public boolean existeHorario(String medico, LocalDateTime dataHora, int ignorarId) {
        String sql = "SELECT 1 FROM consultas WHERE LOWER(medico) = LOWER(?) AND data_hora = ? AND id <> ?";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setString(1, medico);
            statement.setTimestamp(2, Timestamp.valueOf(dataHora));
            statement.setInt(3, ignorarId);
            try (ResultSet resultado = statement.executeQuery()) {
                return resultado.next();
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível verificar a disponibilidade do horário.", e);
        }
    }

    private static Consulta mapear(ResultSet resultado) throws SQLException {
        Paciente paciente = new Paciente(
                resultado.getInt("paciente_id"), resultado.getString("nome"),
                resultado.getString("cpf"), resultado.getString("convenio"),
                resultado.getString("foto"));
        String historico = resultado.getString("historico");
        if (historico != null && !historico.isEmpty()) {
            for (String entrada : historico.split("\\n", -1)) {
                if (!entrada.isEmpty()) paciente.adicionarHistorico(entrada);
            }
        }
        Consulta consulta = new Consulta(
                resultado.getInt("id"), paciente, resultado.getString("medico"),
                resultado.getTimestamp("data_hora").toLocalDateTime());
        consulta.setStatus(resultado.getString("status"));
        long orcamento = resultado.getLong("orcamento_centavos");
        consulta.setOrcamentoCentavos(resultado.wasNull() ? null : orcamento);
        return consulta;
    }

    private static DatabaseException erroBanco(String mensagem, SQLException e) {
        return new DatabaseException(mensagem, e.getSQLState(), e);
    }
}
