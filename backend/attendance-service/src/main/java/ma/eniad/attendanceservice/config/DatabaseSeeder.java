package ma.eniad.attendanceservice.config;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;

@Configuration
public class DatabaseSeeder {

    private static final Long TEACHER_ID = 2L;
    private static final String TEACHER_FULL_NAME = "Mariam Fahim";
    private static final String GPS_LAT = "34.6894";
    private static final String GPS_LON = "-1.9123";

    @Bean
    public CommandLineRunner seedAttendanceDatabase(
            AttendanceSessionRepository attendanceSessionRepository,
            AttendanceRecordRepository attendanceRecordRepository
    ) {
        return args -> {
            if (attendanceSessionRepository.count() > 0) {
                System.out.println("Attendance database already seeded. Skipping...");
                return;
            }

            List<SeedStudent> groupOneStudents = List.of(
                    new SeedStudent(6L, 1L, "Mariam", "Fahim", "mariamfahim@uma.ac.ma", "250001"),
                    new SeedStudent(6L, 1L, "Ayoub", "Elebbar", "ayoubelebbar15@gmail.com", "250011"),
                    new SeedStudent(7L, 1L, "Yassine", "Bennani", "student.g1.02@gmail.com", "24000002"),
                    new SeedStudent(8L, 1L, "Salma", "Naciri", "student.g1.03@gmail.com", "24000003"),
                    new SeedStudent(9L, 1L, "Omar", "Ait Lahcen", "student.g1.04@gmail.com", "24000004"),
                    new SeedStudent(10L, 1L, "Imane", "El Amrani", "student.g1.05@gmail.com", "24000005")
            );

            List<SeedStudent> groupTwoStudents = List.of(
                    new SeedStudent(11L, 2L, "Mehdi", "Tazi", "student.g2.01@gmail.com", "24000006"),
                    new SeedStudent(12L, 2L, "Noura", "Fassi", "student.g2.02@gmail.com", "24000007"),
                    new SeedStudent(13L, 2L, "Hamza", "Raji", "student.g2.03@gmail.com", "24000008"),
                    new SeedStudent(14L, 2L, "Aya", "Mansouri", "student.g2.04@gmail.com", "24000009"),
                    new SeedStudent(15L, 2L, "Anas", "Berrada", "student.g2.05@gmail.com", "24000010")
            );

            seedFinalizedSession(
                    attendanceSessionRepository,
                    attendanceRecordRepository,
                    groupOneStudents,
                    "Programmation Java",
                    "Salle B12",
                    AttendanceSessionMethod.QR_CODE,
                    LocalDateTime.now().minusDays(18),
                    List.of(6L, 7L, 8L, 10L)
            );
            seedFinalizedSession(
                    attendanceSessionRepository,
                    attendanceRecordRepository,
                    groupOneStudents,
                    "Bases de donnees",
                    "Lab 2",
                    AttendanceSessionMethod.FACE_ID,
                    LocalDateTime.now().minusDays(12),
                    List.of(6L, 8L, 9L)
            );
            seedFinalizedSession(
                    attendanceSessionRepository,
                    attendanceRecordRepository,
                    groupOneStudents,
                    "Reseaux",
                    "Amphi A",
                    AttendanceSessionMethod.MANUAL,
                    LocalDateTime.now().minusDays(7),
                    List.of(7L, 8L, 9L, 10L)
            );
            seedFinalizedSession(
                    attendanceSessionRepository,
                    attendanceRecordRepository,
                    groupTwoStudents,
                    "Programmation Java",
                    "Salle B12",
                    AttendanceSessionMethod.QR_CODE,
                    LocalDateTime.now().minusDays(16),
                    List.of(11L, 12L, 14L, 15L)
            );
            seedFinalizedSession(
                    attendanceSessionRepository,
                    attendanceRecordRepository,
                    groupTwoStudents,
                    "Bases de donnees",
                    "Lab 2",
                    AttendanceSessionMethod.FACE_ID,
                    LocalDateTime.now().minusDays(10),
                    List.of(11L, 13L, 14L)
            );
            seedFinalizedSession(
                    attendanceSessionRepository,
                    attendanceRecordRepository,
                    groupTwoStudents,
                    "Reseaux",
                    "Amphi A",
                    AttendanceSessionMethod.MANUAL,
                    LocalDateTime.now().minusDays(5),
                    List.of(12L, 13L, 15L)
            );

            System.out.println("Attendance history seeded successfully!");
        };
    }

    private void seedFinalizedSession(
            AttendanceSessionRepository attendanceSessionRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            List<SeedStudent> students,
            String courseLabel,
            String roomLabel,
            AttendanceSessionMethod method,
            LocalDateTime startedAt,
            List<Long> presentStudentIds
    ) {
        LocalDateTime endedAt = startedAt.plusMinutes(90);
        int presentCount = presentStudentIds.size();
        int absentCount = students.size() - presentCount;

        AttendanceSession session = AttendanceSession.builder()
                .teacherId(TEACHER_ID)
                .teacherFullName(TEACHER_FULL_NAME)
                .courseLabel(courseLabel)
                .roomLabel(roomLabel)
                .gpsLat(GPS_LAT)
                .gpsLon(GPS_LON)
                .startedAt(startedAt)
                .endsAt(endedAt)
                .endedAt(endedAt)
                .status(AttendanceSessionStatus.FINALIZED)
                .method(method)
                .presentCount(presentCount)
                .absentCount(absentCount)
                .unknownCount(0)
                .groupIds(List.of(students.get(0).groupId()))
                .build();
        AttendanceSession savedSession = attendanceSessionRepository.save(session);

        List<AttendanceRecord> records = new ArrayList<>();
        for (SeedStudent student : students) {
            boolean present = presentStudentIds.contains(student.studentId());
            LocalDateTime markedAt = present ? startedAt.plusMinutes(5 + student.studentId() % 12) : null;
            records.add(AttendanceRecord.builder()
                    .sessionId(savedSession.getId())
                    .studentId(student.studentId())
                    .groupId(student.groupId())
                    .firstName(student.firstName())
                    .lastName(student.lastName())
                    .email(student.email())
                    .pfpUrl(null)
                    .numApogee(student.numApogee())
                    .status(present ? AttendanceStudentStatus.PRESENT : AttendanceStudentStatus.ABSENT)
                    .markMethod(present ? method : null)
                    .markedAt(markedAt)
                    .build());
        }

        attendanceRecordRepository.saveAll(records);
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
