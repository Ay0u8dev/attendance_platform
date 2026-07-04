package ma.eniad.notificationservice.config;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.Arrays;
import java.util.stream.Collectors;

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

        repairCheckConstraint("notifications_type_check", "type", NotificationType.values());
        repairCheckConstraint("notifications_severity_check", "severity", NotificationSeverity.values());
        repairCheckConstraint("notifications_recipient_role_check", "recipient_role", RecipientRole.values());
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

    private void repairCheckConstraint(String constraintName, String columnName, Enum<?>[] allowedValues) {
        String allowedSql = Arrays.stream(allowedValues)
                .map(Enum::name)
                .map(this::quoteSqlLiteral)
                .collect(Collectors.joining(", "));

        jdbcTemplate.execute("alter table notifications drop constraint if exists " + constraintName);
        jdbcTemplate.execute(
                "alter table notifications add constraint " + constraintName +
                        " check (" + columnName + " in (" + allowedSql + "))"
        );
    }

    private String quoteSqlLiteral(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
