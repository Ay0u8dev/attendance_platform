package ma.eniad.attendanceservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;

@Configuration
public class AttendanceSchemaGuard {

    @Bean
    @Order(0)
    public CommandLineRunner allowJustifiedAttendanceStatus(
            JdbcTemplate jdbcTemplate,
            DataSource dataSource
    ) {
        return args -> {
            if (!isPostgres(dataSource)) {
                return;
            }

            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS attendance_records
                    DROP CONSTRAINT IF EXISTS attendance_records_status_check
                    """);
            jdbcTemplate.execute("""
                    ALTER TABLE IF EXISTS attendance_records
                    ADD CONSTRAINT attendance_records_status_check
                    CHECK (status IN ('UNKNOWN', 'PRESENT', 'ABSENT', 'JUSTIFIED'))
                    """);
        };
    }

    private boolean isPostgres(DataSource dataSource) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName().toLowerCase().contains("postgresql");
        }
    }
}
