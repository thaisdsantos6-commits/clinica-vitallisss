# Clínica Médica

## Descrição

Sistema de gerenciamento de clínica médica (Centro de Saúde Vitalis), desenvolvido para demonstrar conhecimentos de desenvolvimento web, backend, frontend, organização em camadas (MVC), autenticação, banco de dados e API REST.

O backend em Java também serve o frontend e usa PostgreSQL para persistir pacientes e consultas.

> **Importante:** usuários e sessões ainda são mantidos em memória. As credenciais de demonstração não devem ser usadas em produção.

## Tecnologias

- Java 17 (`com.sun.net.httpserver`) e Maven
- PostgreSQL via JDBC
- HTML5
- CSS3
- JavaScript (puro, sem frameworks)
- API REST (JSON sobre HTTP)
- Arquitetura em camadas / MVC
- Git e GitHub

## Funcionalidades

- **Login e logout**, com sessão controlada pelo servidor (cookie `HttpOnly`) e encerramento por inatividade (10 min)
- **Cadastro e edição de pacientes** (nome, CPF, convênio e foto opcional), com validação de CPF
- **Listagem de pacientes**, com busca por nome, CPF ou convênio e CPF mascarado na tabela
- **Exclusão de pacientes** (as consultas do paciente excluído também são removidas)
- **Agendamento de consultas** (paciente, médico, data e hora), com orçamento total opcional em reais
- **Edição e remoção do orçamento** pela agenda, com valores exibidos em BRL
- **Cancelamento de consultas** pela agenda
- **Reagendamento** e **listagem de consultas**, agrupadas por dia
- **Dashboard** (tela inicial) com a próxima consulta, totais e próximos atendimentos
- **Validação de dados** no frontend (retorno rápido) e **novamente no backend** (a regra que vale)
- Tema claro/escuro

## Estrutura

| Pasta | Responsabilidade |
|---|---|
| `backend/` | Código Java (servidor e API) |
| `backend/src/controller` | Liga a camada HTTP às regras de negócio (`PacienteController`) |
| `backend/src/model` | Entidades: `Paciente`, `Consulta`, `Usuario` |
| `backend/src/repository` | Armazenamento e consulta de dados (`PacienteRepository`, `ConsultaRepository`, PostgreSQL) |
| `backend/src/service` | Regras de negócio e validações: `PacienteService`, `AgendaService`, `AutenticacaoService` |
| `backend/src/util` | Funções auxiliares: `Seguranca` (hash de senha e tokens) |
| `backend/src/ApiServer.java` | Ponto de entrada: rotas `/api` e arquivos do frontend |
| `frontend/` | Interface web: `index.html`, `style.css`, `app.js` |
| `docs/` | Documentação adicional (`API.md`) |

## Requisitos

- **JDK 17 ou superior** e **Maven 3.9+** para executar localmente.
- Um banco PostgreSQL. No Render, use a URL interna do banco; localmente, use uma instância PostgreSQL acessível.
- Um navegador moderno. As fontes vêm do Google Fonts; sem internet o sistema funciona normalmente com fontes do sistema.

## Como executar

### Windows (recomendado)

1. Instale o JDK 17+ e o Maven 3.9+.
2. Configure `DATABASE_URL` com a URL JDBC ou URL PostgreSQL do seu banco.
3. Dê duplo clique em `run.bat` (ou execute `run.bat` no terminal, dentro da pasta do projeto). Ele compila o backend e inicia o servidor.
4. Abra <http://localhost:8080> no navegador.
5. Para encerrar, feche a janela ou pressione `Ctrl+C`.

### Manualmente (Windows, Linux ou macOS)

Na **raiz** do projeto, configure a conexão com o PostgreSQL e inicie com Maven.
No Windows PowerShell:

```powershell
$env:DATABASE_URL = "jdbc:postgresql://localhost:5432/clinica"
$env:DATABASE_USER = "seu_usuario"
$env:DATABASE_PASSWORD = "sua_senha"
mvn -DskipTests package
java -jar target/clinica-vitallis-1.0.0.jar
```

No Linux ou macOS:

```bash
export DATABASE_URL="jdbc:postgresql://localhost:5432/clinica"
export DATABASE_USER="seu_usuario"
export DATABASE_PASSWORD="sua_senha"
mvn -DskipTests package
java -jar target/clinica-vitallis-1.0.0.jar
```

O servidor cria as tabelas `pacientes` e `consultas` na inicialização. `DATABASE_URL` aceita o formato JDBC (`jdbc:postgresql://...`) e os formatos `postgres://` ou `postgresql://` fornecidos pelo Render.

Depois acesse <http://localhost:8080>.

### Credencial de demonstração

| Usuário | Senha |
|---|---|
| `Vitallis` | `Vitallis2026` |

## API

Resumo dos endpoints (detalhes, corpos e respostas em [`API.md`](API.md)):

| Método | URL | Finalidade |
|---|---|---|
| `POST` | `/api/login` | Autentica e abre a sessão |
| `POST` | `/api/logout` | Encerra a sessão |
| `GET` | `/api/patients` | Lista pacientes |
| `POST` | `/api/patients` | Cadastra paciente |
| `PUT` | `/api/patients/{id}` | Atualiza o cadastro do paciente |
| `DELETE` | `/api/patients/{id}` | Exclui paciente |
| `GET` | `/api/appointments` | Lista consultas |
| `POST` | `/api/appointments` | Agenda consulta (aceita `orcamentoCentavos` opcional, inteiro em centavos) |
| `PUT` | `/api/appointments/{id}` | Reagenda consulta |
| `DELETE` | `/api/appointments/{id}` | Cancela consulta |
| `PUT` | `/api/appointments/{id}/budget` | Atualiza ou remove o orçamento (`orcamentoCentavos`; `null` remove) |

Todas as rotas, exceto `/api/login` e `/api/logout`, exigem sessão válida (`401` caso contrário).

## Segurança

- As credenciais presentes no projeto (`Vitallis` / `Vitallis2026`) são **apenas para demonstração** e estão identificadas como DEMO em `AutenticacaoService.java`. Não use em produção.
- Senhas são guardadas como hash **PBKDF2-HMAC-SHA256** com salt aleatório e comparadas em tempo constante (`util/Seguranca.java`).
- A sessão é um token aleatório de 256 bits em cookie `HttpOnly` + `SameSite=Strict`; expira após 10 minutos sem uso.
- Todas as validações do frontend são repetidas no backend.
- O frontend renderiza dados com `textContent` (nunca `innerHTML`) para evitar XSS.
- **Nunca publique** `.env`, senhas reais, tokens, chaves privadas ou credenciais.

## Melhorias futuras

- Autenticação mais robusta (HTTPS, limite de tentativas no servidor, múltiplos usuários)
- Controle de permissões por perfil
- Testes automatizados
- Documentação da API em formato OpenAPI
- Gestão de usuários e sessões persistentes

