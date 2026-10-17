# Compila e roda o servidor Java (somente JDK, sem Maven).
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY backend ./backend
RUN mkdir out && javac -encoding UTF-8 -d out $(find backend/src -name '*.java')

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/out ./out
COPY frontend ./frontend
# Aceita conexões externas (necessário em servidor). A porta vem da variável PORT do Render.
ENV CLINICA_HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["java", "-cp", "out", "ApiServer"]
