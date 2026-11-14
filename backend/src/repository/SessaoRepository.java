package repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import util.Database;
import util.DatabaseException;

/**
 * Sessões de login gravadas no PostgreSQL (tabela "sessoes").
 * Assim, reiniciar o servidor não derruba quem já estava logado.
 *
 * O banco guarda só o hash SHA-256 do token, nunca o token em si:
 * quem tiver acesso ao banco não consegue usar as sessões gravadas.
 */
public class SessaoRepository {

    public void criar(String tokenHash, int usuarioId) {
        executar("INSERT INTO sessoes (token_hash, usuario_id, ultimo_uso) VALUES (?, ?, NOW())",
                "Não foi possível criar a sessão.", tokenHash, usuarioId);
    }

    /**
     * Renova o prazo da sessão e devolve o ID do usuário, ou -1 se a sessão não existir
     * ou tiver passado do limite de inatividade.
     */
    public int renovar(String tokenHash, long inatividadeMs) {
        String sql = "UPDATE sessoes SET ultimo_uso = NOW() "
                + "WHERE token_hash = ? AND ultimo_uso > NOW() - (? * INTERVAL '1 millisecond') "
                + "RETURNING usuario_id";
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            statement.setString(1, tokenHash);
            statement.setLong(2, inatividadeMs);
            try (ResultSet resultado = statement.executeQuery()) {
                return resultado.next() ? resultado.getInt("usuario_id") : -1;
            }
        } catch (SQLException e) {
            throw new DatabaseException("Não foi possível validar a sessão.", e.getSQLState(), e);
        }
    }

    public void remover(String tokenHash) {
        executar("DELETE FROM sessoes WHERE token_hash = ?", "Não foi possível encerrar a sessão.", tokenHash);
    }

    public void removerDoUsuario(int usuarioId) {
        executar("DELETE FROM sessoes WHERE usuario_id = ?", "Não foi possível encerrar as sessões do usuário.", usuarioId);
    }

    /** Apaga as sessões vencidas para a tabela não crescer sem limite. */
    public void removerExpiradas(long inatividadeMs) {
        executar("DELETE FROM sessoes WHERE ultimo_uso <= NOW() - (? * INTERVAL '1 millisecond')",
                "Não foi possível limpar as sessões expiradas.", inatividadeMs);
    }

    private static void executar(String sql, String mensagemErro, Object... parametros) {
        try (Connection conexao = Database.conectar();
             PreparedStatement statement = conexao.prepareStatement(sql)) {
            for (int i = 0; i < parametros.length; i++) {
                statement.setObject(i + 1, parametros[i]);
            }
            statement.executeUpdate();
        } catch (SQLException e) {
            throw new DatabaseException(mensagemErro, e.getSQLState(), e);
        }
    }
}
