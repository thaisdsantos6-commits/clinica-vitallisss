@echo off
chcp 65001 >nul
title Clinica Medica
cd /d "%~dp0"

rem ------------------------------------------------------------------
rem  Compila o backend com Maven e inicia o servidor.
rem  Uso: de um duplo clique neste arquivo ou execute "run.bat" na raiz.
rem  Requer JDK 17 ou superior e Maven no PATH.
rem
rem  Opcional - trocar a credencial de demonstracao (Vitallis / Vitallis2026):
rem      set CLINICA_ADMIN_LOGIN=seu_login
rem      set CLINICA_ADMIN_SENHA=sua_senha
rem  Opcional - abrir na rede local (padrao: so este computador):
rem      set CLINICA_HOST=0.0.0.0
rem ------------------------------------------------------------------

echo.
echo ========================================
echo      SISTEMA CLINICA MEDICA
echo ========================================
echo.

where mvn >nul 2>nul
if errorlevel 1 (
    echo ERRO: "mvn" nao encontrado.
    echo Instale o Maven e o JDK 17 ou superior e abra um novo terminal.
    pause
    exit /b 1
)

echo Compilando Java...
mvn -B -DskipTests package

if errorlevel 1 (
    echo.
    echo ERRO: nao foi possivel compilar.
    echo Verifique se o JDK 17 e o Maven estao instalados.
    pause
    exit /b 1
)

echo.
echo Servidor iniciado em http://localhost:8080
echo Feche esta janela (ou pressione Ctrl+C) para encerrar o sistema.
echo.

java -jar target\clinica-vitallis-1.0.0.jar

pause
