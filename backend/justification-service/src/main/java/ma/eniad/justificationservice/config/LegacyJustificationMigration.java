package ma.eniad.justificationservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
@Order(-10)
public class LegacyJustificationMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public LegacyJustificationMigration(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!isPostgres() || !legacyTableExists()) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO justifications (
                    session_id,
                    student_id,
                    group_id,
                    teacher_name,
                    student_name,
                    student_email,
                    student_code,
                    module,
                    room_label,
                    session_date,
                    session_ended_at,
                    status,
                    reason,
                    submitted_at,
                    document_url,
                    teacher_comment,
                    reviewed_by,
                    reviewer_role,
                    reviewed_at,
                    updated_at
                )
                SELECT
                    session_id,
                    student_id,
                    group_id,
                    teacher_full_name,
                    trim(concat(student_first_name, ' ', student_last_name)),
                    student_email,
                    num_apogee,
                    course_label,
                    room_label,
                    absence_started_at,
                    absence_ended_at,
                    status,
                    motive,
                    created_at,
                    NULL,
                    admin_comment,
                    CAST(reviewed_by AS varchar),
                    CASE WHEN reviewed_by IS NULL THEN NULL ELSE 'ADMIN' END,
                    reviewed_at,
                    updated_at
                FROM attendance_justifications
                ON CONFLICT (session_id, student_id) DO NOTHING
                """);

        Integer missingRows = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM (
                    SELECT DISTINCT legacy.session_id, legacy.student_id
                    FROM attendance_justifications legacy
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM justifications canonical
                        WHERE canonical.session_id = legacy.session_id
                          AND canonical.student_id = legacy.student_id
                    )
                ) missing
                """, Integer.class);
        if (missingRows != null && missingRows == 0) {
            jdbcTemplate.execute("DROP TABLE attendance_justifications");
        }
    }

    private boolean legacyTableExists() {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.attendance_justifications') IS NOT NULL",
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private boolean isPostgres() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName().toLowerCase().contains("postgresql");
        }
    }
}
