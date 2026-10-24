# Compila o servidor Java e inclui o driver JDBC do PostgreSQL no JAR.
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY backend ./backend
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/clinica-vitallis-1.0.0.jar ./app.jar
COPY frontend ./frontend
ENV CLINICA_HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
