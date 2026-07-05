package ma.eniad.attendanceservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AttendanceSessionProperties.class)
public class PropertiesConfig {
}
