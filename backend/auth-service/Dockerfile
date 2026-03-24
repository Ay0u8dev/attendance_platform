FROM maven:3.9.9-eclipse-temurin-21-alpine

WORKDIR /app

COPY pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src

EXPOSE 8080

CMD ["mvn", "-DskipTests", "spring-boot:run"]
