package ma.eniad.justificationservice.config;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.repository.JustificationRepository;

@Configuration
public class DatabaseSeeder {

    @Bean
    public CommandLineRunner seedJustifications(JustificationRepository repository) {
        return args -> {
            if (repository.count() > 0) {
                System.out.println("Justification seed data already exists. Skipping...");
                return;
            }

            LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);

            repository.saveAll(List.of(
                    Justification.builder()
                            .studentId(7L)
                            .studentName("Sofiane Meziane")
                            .module("Advanced Web Development")
                            .sessionDate(now.minusDays(1).withHour(9).withMinute(0))
                            .status("PENDING")
                            .reason("Medical appointment on the same day.")
                            .submittedAt(now.minusDays(1).withHour(11).withMinute(10))
                            .documentUrl("https://example.com/justification/medical-appointment.pdf")
                            .teacherComment(null)
                            .build(),
                    Justification.builder()
                            .studentId(8L)
                            .studentName("Leila Bensalem")
                            .module("Database Architecture")
                            .sessionDate(now.minusDays(3).withHour(10).withMinute(30))
                            .status("APPROVED")
                            .reason("Transport strike prevented on-time arrival.")
                            .submittedAt(now.minusDays(2).withHour(14).withMinute(5))
                            .documentUrl("https://example.com/justification/transport-strike.pdf")
                            .teacherComment("Approved after verification.")
                            .build(),
                    Justification.builder()
                            .studentId(15L)
                            .studentName("Hamza Rafik")
                            .module("Machine Learning Basics")
                            .sessionDate(now.minusDays(5).withHour(14).withMinute(0))
                            .status("REJECTED")
                            .reason("Family emergency without prior notice.")
                            .submittedAt(now.minusDays(4).withHour(8).withMinute(20))
                            .documentUrl("https://example.com/justification/family-emergency.pdf")
                            .teacherComment("Rejected: missing official documentation.")
                            .build(),
                    Justification.builder()
                            .studentId(13L)
                            .studentName("Nour Eddine Salmi")
                            .module("Data Mining")
                            .sessionDate(now.minusDays(2).withHour(13).withMinute(0))
                            .status("PENDING")
                            .reason("Illness and recovery note pending.")
                            .submittedAt(now.minusDays(2).withHour(15).withMinute(42))
                            .documentUrl("https://example.com/justification/illness-note.pdf")
                            .teacherComment(null)
                            .build(),
                    Justification.builder()
                            .studentId(12L)
                            .studentName("Imane Kabbaj")
                            .module("Software Engineering")
                            .sessionDate(now.minusDays(1).withHour(9).withMinute(0))
                            .status("PENDING")
                            .reason("Surgery recovery.")
                            .submittedAt(now.minusDays(1).withHour(10).withMinute(30))
                            .documentUrl("https://example.com/justification/surgery-recovery.pdf")
                            .teacherComment(null)
                            .build()
            ));

            System.out.println("Justification seed data is ready.");
        };
    }
}
