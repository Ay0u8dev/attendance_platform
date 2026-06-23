package ma.eniad.attendanceservice.config;

import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
@Profile("dev")
public class DatabaseSeeder {

    private static final String GPS_LAT = "34.6894";
    private static final String GPS_LON = "-1.9123";

    @Bean
    @Order(1)
    public CommandLineRunner seedAttendanceDatabase(
            AttendanceSessionRepository attendanceSessionRepository,
            AttendanceRecordRepository attendanceRecordRepository
    ) {
        return args -> {
            List<SeedStudent> groupOneStudents = List.of(
                    new SeedStudent(6L, 1L, "Ayoub", "Elebbar", "ayoubelebbar15@ump.ac.ma", "24000001"),
                    new SeedStudent(7L, 1L, "Yassine", "Bennani", "student.g1.02@ump.ac.ma", "24000002"),
                    new SeedStudent(8L, 1L, "Salma", "Naciri", "student.g1.03@ump.ac.ma", "24000003"),
                    new SeedStudent(9L, 1L, "Omar", "Ait Lahcen", "student.g1.04@ump.ac.ma", "24000004"),
                    new SeedStudent(10L, 1L, "Imane", "El Amrani", "student.g1.05@ump.ac.ma", "24000005")
            );

            List<SeedStudent> groupTwoStudents = List.of(
                    new SeedStudent(11L, 2L, "Mehdi", "Tazi", "student.g2.01@ump.ac.ma", "24000006"),
                    new SeedStudent(12L, 2L, "Noura", "Fassi", "student.g2.02@ump.ac.ma", "24000007"),
                    new SeedStudent(13L, 2L, "Hamza", "Raji", "student.g2.03@ump.ac.ma", "24000008"),
                    new SeedStudent(14L, 2L, "Aya", "Mansouri", "student.g2.04@ump.ac.ma", "24000009"),
                    new SeedStudent(15L, 2L, "Anas", "Berrada", "student.g2.05@ump.ac.ma", "24000010")
            );

            List<SeedStudent> groupThreeStudents = List.of(
                    new SeedStudent(16L, 3L, "Lina", "El Idrissi", "student.g3.01@ump.ac.ma", "24000011"),
                    new SeedStudent(17L, 3L, "Adam", "Rachidi", "student.g3.02@ump.ac.ma", "24000012"),
                    new SeedStudent(18L, 3L, "Meryem", "Ouahbi", "student.g3.03@ump.ac.ma", "24000013"),
                    new SeedStudent(19L, 3L, "Ilyas", "Ziani", "student.g3.04@ump.ac.ma", "24000014"),
                    new SeedStudent(20L, 3L, "Hajar", "Nouri", "student.g3.05@ump.ac.ma", "24000015"),
                    new SeedStudent(21L, 3L, "Youssef", "Kabbaj", "student.g3.06@ump.ac.ma", "24000016")
            );

            LocalDate today = LocalDate.now();
            List<SeedSession> sessions = List.of(
                    new SeedSession(5L, "Ayoub Elebbar", groupOneStudents, "Algorithmique 1", "Amphi A", AttendanceSessionMethod.MANUAL, today, LocalTime.of(8, 30), List.of(6L, 7L, 8L, 9L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(16L, "Nadia El Amrani", groupTwoStudents, "Bases de donnees", "Lab 2", AttendanceSessionMethod.FACE_ID, today, LocalTime.of(10, 30), List.of(11L, 12L, 13L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(17L, "Youssef Bennani", groupThreeStudents, "Reseaux", "Salle B12", AttendanceSessionMethod.QR_CODE, today, LocalTime.of(14, 0), List.of(16L, 17L, 18L, 19L, 20L), AttendanceSessionStatus.ACTIVE),
                    new SeedSession(5L, "Ayoub Elebbar", groupOneStudents, "Programmation Java", "Salle B12", AttendanceSessionMethod.QR_CODE, today.minusDays(1), LocalTime.of(9, 0), List.of(6L, 7L, 8L, 10L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(16L, "Nadia El Amrani", groupTwoStudents, "Algorithmique 1", "Amphi A", AttendanceSessionMethod.MANUAL, today.minusDays(2), LocalTime.of(15, 0), List.of(11L, 12L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(17L, "Youssef Bennani", groupThreeStudents, "Bases de donnees", "Lab 2", AttendanceSessionMethod.FACE_ID, today.minusDays(3), LocalTime.of(8, 30), List.of(16L, 17L, 18L, 21L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(5L, "Ayoub Elebbar", groupTwoStudents, "Reseaux", "Amphi B", AttendanceSessionMethod.MANUAL, today.minusDays(5), LocalTime.of(11, 0), List.of(11L, 13L, 14L, 15L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(16L, "Nadia El Amrani", groupOneStudents, "Bases de donnees", "Lab 1", AttendanceSessionMethod.FACE_ID, today.minusDays(7), LocalTime.of(16, 0), List.of(6L, 8L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(17L, "Youssef Bennani", groupThreeStudents, "Programmation Java", "Salle C4", AttendanceSessionMethod.QR_CODE, today.minusDays(10), LocalTime.of(10, 0), List.of(16L, 17L, 18L, 19L, 20L, 21L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(5L, "Ayoub Elebbar", groupOneStudents, "Reseaux", "Amphi A", AttendanceSessionMethod.MANUAL, today.minusDays(13), LocalTime.of(13, 30), List.of(7L, 8L, 9L, 10L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(16L, "Nadia El Amrani", groupTwoStudents, "Programmation Java", "Salle B12", AttendanceSessionMethod.QR_CODE, today.minusDays(20), LocalTime.of(8, 0), List.of(11L, 12L, 14L), AttendanceSessionStatus.FINALIZED),
                    new SeedSession(17L, "Youssef Bennani", groupThreeStudents, "Algorithmique 1", "Amphi C", AttendanceSessionMethod.MANUAL, today.minusDays(28), LocalTime.of(17, 0), List.of(16L, 19L, 20L), AttendanceSessionStatus.FINALIZED)
            );

            int created = 0;
            for (SeedSession session : sessions) {
                if (seedSessionIfMissing(attendanceSessionRepository, attendanceRecordRepository, session)) {
                    created++;
                }
            }

            System.out.printf("Attendance demo seed checked. Created %d session(s).%n", created);
        };
    }

    private boolean seedSessionIfMissing(
            AttendanceSessionRepository attendanceSessionRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            SeedSession seed
    ) {
        LocalDateTime startedAt = LocalDateTime.of(seed.date(), seed.startTime());
        boolean exists = attendanceSessionRepository.findAll().stream()
                .anyMatch(session -> seed.courseLabel().equals(session.getCourseLabel())
                        && seed.teacherId().equals(session.getTeacherId())
                        && session.getStartedAt().toLocalDate().equals(seed.date())
                        && session.getGroupIds().contains(seed.students().get(0).groupId()));
        if (exists) {
            return false;
        }

        LocalDateTime endsAt = startedAt.plusMinutes(90);
        LocalDateTime endedAt = seed.status() == AttendanceSessionStatus.FINALIZED ? endsAt : null;
        int presentCount = seed.presentStudentIds().size();
        int unknownCount = seed.status() == AttendanceSessionStatus.ACTIVE ? 1 : 0;
        int absentCount = Math.max(0, seed.students().size() - presentCount - unknownCount);

        AttendanceSession session = AttendanceSession.builder()
                .teacherId(seed.teacherId())
                .teacherFullName(seed.teacherFullName())
                .courseLabel(seed.courseLabel())
                .roomLabel(seed.roomLabel())
                .gpsLat(GPS_LAT)
                .gpsLon(GPS_LON)
                .startedAt(startedAt)
                .endsAt(endsAt)
                .endedAt(endedAt)
                .status(seed.status())
                .method(seed.method())
                .presentCount(presentCount)
                .absentCount(absentCount)
                .unknownCount(unknownCount)
                .groupIds(List.of(seed.students().get(0).groupId()))
                .build();
        AttendanceSession savedSession = attendanceSessionRepository.save(session);

        List<AttendanceRecord> records = new ArrayList<>();
        for (int index = 0; index < seed.students().size(); index++) {
            SeedStudent student = seed.students().get(index);
            boolean present = seed.presentStudentIds().contains(student.studentId());
            boolean open = seed.status() == AttendanceSessionStatus.ACTIVE && index == seed.students().size() - 1;
            AttendanceStudentStatus status = open
                    ? AttendanceStudentStatus.UNKNOWN
                    : present ? AttendanceStudentStatus.PRESENT : AttendanceStudentStatus.ABSENT;
            records.add(AttendanceRecord.builder()
                    .sessionId(savedSession.getId())
                    .studentId(student.studentId())
                    .groupId(student.groupId())
                    .firstName(student.firstName())
                    .lastName(student.lastName())
                    .email(student.email())
                    .pfpUrl(null)
                    .numApogee(student.numApogee())
                    .status(status)
                    .markMethod(present ? seed.method() : null)
                    .markedAt(present ? startedAt.plusMinutes(4 + index) : null)
                    .build());
        }

        attendanceRecordRepository.saveAll(records);
        return true;
    }

    private record SeedSession(
            Long teacherId,
            String teacherFullName,
            List<SeedStudent> students,
            String courseLabel,
            String roomLabel,
            AttendanceSessionMethod method,
            LocalDate date,
            LocalTime startTime,
            List<Long> presentStudentIds,
            AttendanceSessionStatus status
    ) {
    }

    private record SeedStudent(
            Long studentId,
            Long groupId,
            String firstName,
            String lastName,
            String email,
            String numApogee
    ) {
    }
}
