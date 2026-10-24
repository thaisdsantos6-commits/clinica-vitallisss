package repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import model.Paciente;
import util.Database;
import util.DatabaseException;

public class PacienteRepository {
    public Paciente salvar(Paciente paciente) {
        String sql = "INSERT INTO pacientes (nome, cpf, convenio, foto, historico) "
                + "VALUES (?, ?, ?, ?, ?) RETURNING id";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            preencher(statement, paciente);
            try (ResultSet resultado = statement.executeQuery()) {
                if (!resultado.next()) throw new SQLException("O PostgreSQL não retornou o ID do paciente.");
                Paciente salvo = new Paciente(resultado.getInt("id"), paciente.getNome(),
                        paciente.getCpf(), paciente.getConvenio(), paciente.getFoto());
                if (!paciente.getHistorico().isEmpty()) {
                    for (String entrada : paciente.getHistorico().split("\\n", -1)) {
                        if (!entrada.isEmpty()) salvo.adicionarHistorico(entrada);
                    }
                }
                return salvo;
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível salvar o paciente.", e);
        }
    }

    public List<Paciente> listarTodos() {
        String sql = "SELECT id, nome, cpf, convenio, foto, historico FROM pacientes ORDER BY id";
        List<Paciente> pacientes = new ArrayList<>();
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql);
             ResultSet resultado = statement.executeQuery()) {
            while (resultado.next()) pacientes.add(mapear(resultado));
            return pacientes;
        } catch (SQLException e) {
            throw erroBanco("Não foi possível listar os pacientes.", e);
        }
    }

    public Optional<Paciente> buscarPorId(int id) {
        String sql = "SELECT id, nome, cpf, convenio, foto, historico FROM pacientes WHERE id = ?";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setInt(1, id);
            try (ResultSet resultado = statement.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível buscar o paciente.", e);
        }
    }

    public boolean existePorCpf(String cpf) {
        return existe("SELECT 1 FROM pacientes WHERE cpf = ?", cpf, null);
    }

    public boolean existePorCpfExcetoId(String cpf, int id) {
        return existe("SELECT 1 FROM pacientes WHERE cpf = ? AND id <> ?", cpf, id);
    }

    public Optional<Paciente> atualizar(int id, String nome, String cpf, String convenio, String foto) {
        String sql = "UPDATE pacientes SET nome = ?, cpf = ?, convenio = ?, foto = ? WHERE id = ?";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setString(1, nome);
            statement.setString(2, cpf);
            statement.setString(3, convenio);
            statement.setString(4, foto);
            statement.setInt(5, id);
            if (statement.executeUpdate() == 0) return Optional.empty();
            return buscarPorId(id);
        } catch (SQLException e) {
            throw erroBanco("Não foi possível atualizar o paciente.", e);
        }
    }

    public boolean remover(int id) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement("DELETE FROM pacientes WHERE id = ?")) {
            statement.setInt(1, id);
            return statement.executeUpdate() > 0;
        } catch (SQLException e) {
            throw erroBanco("Não foi possível excluir o paciente.", e);
        }
    }

    private boolean existe(String sql, String cpf, Integer id) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setString(1, cpf);
            if (id != null) statement.setInt(2, id);
            try (ResultSet resultado = statement.executeQuery()) {
                return resultado.next();
            }
        } catch (SQLException e) {
            throw erroBanco("Não foi possível validar o CPF.", e);
        }
    }

    private static void preencher(PreparedStatement statement, Paciente paciente) throws SQLException {
        statement.setString(1, paciente.getNome());
        statement.setString(2, paciente.getCpf());
        statement.setString(3, paciente.getConvenio());
        statement.setString(4, paciente.getFoto());
        statement.setString(5, paciente.getHistorico());
    }

    private static Paciente mapear(ResultSet resultado) throws SQLException {
        Paciente paciente = new Paciente(
                resultado.getInt("id"), resultado.getString("nome"), resultado.getString("cpf"),
                resultado.getString("convenio"), resultado.getString("foto"));
        String historico = resultado.getString("historico");
        if (historico != null && !historico.isEmpty()) {
            for (String entrada : historico.split("\\n", -1)) {
                if (!entrada.isEmpty()) paciente.adicionarHistorico(entrada);
            }
        }
        return paciente;
    }

    private static DatabaseException erroBanco(String mensagem, SQLException e) {
        return new DatabaseException(mensagem, e.getSQLState(), e);
    }
}
