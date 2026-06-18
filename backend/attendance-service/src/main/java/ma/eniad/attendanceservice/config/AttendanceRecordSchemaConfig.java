package ma.eniad.attendanceservice.config;

import javax.sql.DataSource;

import java.sql.Connection;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class AttendanceRecordSchemaConfig {

    @Bean
    public CommandLineRunner ensureAttendanceRecordStatusConstraint(
            DataSource dataSource,
            JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            String databaseProductName;
            try (Connection connection = dataSource.getConnection()) {
                databaseProductName = connection.getMetaData().getDatabaseProductName();
            }
            if (!databaseProductName.toLowerCase().contains("postgresql") || !attendanceRecordsTableExists(jdbcTemplate)) {
                return;
            }

            jdbcTemplate.execute("""
                    alter table attendance_records
                    drop constraint if exists attendance_records_status_check
                    """);
            jdbcTemplate.execute("""
                    alter table attendance_records
                    add constraint attendance_records_status_check
                    check (status in ('UNKNOWN', 'PRESENT', 'ABSENT', 'JUSTIFIED'))
                    """);
        };
    }

    private boolean attendanceRecordsTableExists(JdbcTemplate jdbcTemplate) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                        select exists (
                            select 1
                            from information_schema.tables
                            where table_schema = current_schema()
                              and table_name = 'attendance_records'
                        )
                        """,
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }
}
