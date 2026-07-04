package ma.eniad.notificationservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;

@Component
@RequiredArgsConstructor
public class NotificationSchemaGuard implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Value("${notification.schema.repair-enum-checks:true}")
    private boolean repairEnumChecks;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!repairEnumChecks || !isPostgreSql()) {
            return;
        }

        verifyCheckConstraint("notifications_type_check");
        verifyCheckConstraint("notifications_severity_check");
        verifyCheckConstraint("notifications_recipient_role_check");
    }

    private boolean isPostgreSql() throws Exception {
        DataSource dataSource = jdbcTemplate.getDataSource();
        if (dataSource == null) {
            return false;
        }

        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            return metaData.getDatabaseProductName().toLowerCase().contains("postgresql");
        }
    }

    private void verifyCheckConstraint(String constraintName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.table_constraints
                where table_name = 'notifications'
                  and constraint_name = ?
                  and constraint_type = 'CHECK'
                """,
                Integer.class,
                constraintName
        );

        if (count == null || count == 0) {
            throw new IllegalStateException(
                    "Missing notifications check constraint: " + constraintName +
                            ". Apply the versioned database migration before starting the service."
            );
        }
    }
}
