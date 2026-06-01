package ma.eniad.attendanceservice.config;

import java.time.LocalDateTime;
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

    private static final Long SEEDED_TEACHER_ID = 2L;
    private static final String DEFAULT_GPS_LAT = "34.6814";
    private static final String DEFAULT_GPS_LON = "-1.9086";

    @Bean
    public CommandLineRunner seedAttendanceData(
            AttendanceSessionRepository sessionRepository,
            AttendanceRecordRepository recordRepository) {
        return args -> {
            if (sessionRepository.count() > 0) {
                System.out.println("Attendance seed data already exists. Skipping...");
                return;
            }

            List<SeedStudent> giStudents = List.of(
                    new SeedStudent(7L, 1L, "Sofiane", "Meziane", "sofiane.meziane@ump.ac.ma", "250001"),
                    new SeedStudent(8L, 1L, "Leila", "Bensalem", "leila.bensalem@ump.ac.ma", "250002"),
                    new SeedStudent(9L, 1L, "Yassine", "El Idrissi", "yassine.elidrissi@ump.ac.ma", "250003"),
                    new SeedStudent(10L, 2L, "Meryem", "Toumi", "meryem.toumi@ump.ac.ma", "250004"),
                    new SeedStudent(11L, 2L, "Bilal", "Ait Hamou", "bilal.aithamou@ump.ac.ma", "250005"),
                    new SeedStudent(12L, 2L, "Imane", "Kabbaj", "imane.kabbaj@ump.ac.ma", "250006")
            );

            List<SeedStudent> idsStudents = List.of(
                    new SeedStudent(13L, 3L, "Nour Eddine", "Salmi", "nour.salmi@ump.ac.ma", "250007"),
                    new SeedStudent(14L, 3L, "Salma", "Alaoui", "salma.alaoui@ump.ac.ma", "250008"),
                    new SeedStudent(15L, 3L, "Hamza", "Rafik", "hamza.rafik@ump.ac.ma", "250009"),
                    new SeedStudent(16L, 3L, "Asmae", "Bennani", "asmae.bennani@ump.ac.ma", "250010")
            );

            createFinalizedSession(
                    sessionRepository,
                    recordRepository,
                    "Advanced Web Development",
                    "Amphi A",
                    AttendanceSessionMethod.MANUAL,
                    List.of(1L, 2L),
                    LocalDateTime.now().minusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0),
                    giStudents,
                    List.of(9L)
            );

            createFinalizedSession(
                    sessionRepository,
                    recordRepository,
                    "Database Architecture",
                    "Salle B12",
                    AttendanceSessionMethod.QR_CODE,
                    List.of(1L, 2L),
                    LocalDateTime.now().minusDays(3).withHour(10).withMinute(30).withSecond(0).withNano(0),
                    giStudents,
                    List.of(8L, 12L)
            );

            createFinalizedSession(
                    sessionRepository,
                    recordRepository,
                    "Machine Learning Basics",
                    "Lab IA",
                    AttendanceSessionMethod.FACE_ID,
                    List.of(3L),
                    LocalDateTime.now().minusDays(5).withHour(14).withMinute(0).withSecond(0).withNano(0),
                    idsStudents,
                    List.of(15L)
            );

            createActiveManualSession(
                    sessionRepository,
                    recordRepository,
                    "Manual Attendance Review",
                    "Salle C01",
                    List.of(1L, 2L),
                    LocalDateTime.now().minusMinutes(30).withSecond(0).withNano(0),
                    giStudents,
                    List.of(11L),
                    List.of(12L)
            );

            System.out.println("Attendance seed data is ready.");
        };
    }

    private void createFinalizedSession(
            AttendanceSessionRepository sessionRepository,
            AttendanceRecordRepository recordRepository,
            String courseLabel,
            String roomLabel,
            AttendanceSessionMethod method,
            List<Long> groupIds,
            LocalDateTime startedAt,
            List<SeedStudent> students,
            List<Long> absentStudentIds) {
        int absentCount = absentStudentIds.size();
        int presentCount = students.size() - absentCount;
        LocalDateTime endedAt = startedAt.plusMinutes(90);

        AttendanceSession session = sessionRepository.saveAndFlush(AttendanceSession.builder()
                .teacherId(SEEDED_TEACHER_ID)
                .courseLabel(courseLabel)
                .roomLabel(roomLabel)
                .gpsLat(DEFAULT_GPS_LAT)
                .gpsLon(DEFAULT_GPS_LON)
                .startedAt(startedAt)
                .endsAt(endedAt)
                .endedAt(endedAt)
                .method(method)
                .status(AttendanceSessionStatus.FINALIZED)
                .presentCount(presentCount)
                .absentCount(absentCount)
                .unknownCount(0)
                .groupIds(groupIds)
                .build());

        recordRepository.saveAll(students.stream()
                .map(student -> toRecord(session.getId(), method, endedAt, student, absentStudentIds.contains(student.id())))
                .toList());
    }

    private void createActiveManualSession(
            AttendanceSessionRepository sessionRepository,
            AttendanceRecordRepository recordRepository,
            String courseLabel,
            String roomLabel,
            List<Long> groupIds,
            LocalDateTime startedAt,
            List<SeedStudent> students,
            List<Long> absentStudentIds,
            List<Long> unknownStudentIds) {
        int absentCount = absentStudentIds.size();
        int unknownCount = unknownStudentIds.size();
        int presentCount = students.size() - absentCount - unknownCount;
        LocalDateTime endedAt = startedAt.plusMinutes(90);

        AttendanceSession session = sessionRepository.saveAndFlush(AttendanceSession.builder()
                .teacherId(SEEDED_TEACHER_ID)
                .courseLabel(courseLabel)
                .roomLabel(roomLabel)
                .gpsLat(DEFAULT_GPS_LAT)
                .gpsLon(DEFAULT_GPS_LON)
                .startedAt(startedAt)
                .endsAt(endedAt)
                .endedAt(endedAt)
                .method(AttendanceSessionMethod.MANUAL)
                .status(AttendanceSessionStatus.ACTIVE)
                .presentCount(presentCount)
                .absentCount(absentCount)
                .unknownCount(unknownCount)
                .groupIds(groupIds)
                .build());

        recordRepository.saveAll(students.stream()
                .map(student -> toActiveRecord(session.getId(), endedAt, student,
                        absentStudentIds.contains(student.id()), unknownStudentIds.contains(student.id())))
                .toList());
    }

    private AttendanceRecord toActiveRecord(
            Long sessionId,
            LocalDateTime endedAt,
            SeedStudent student,
            boolean absent,
            boolean unknown) {
        AttendanceStudentStatus status = unknown
                ? AttendanceStudentStatus.UNKNOWN
                : absent
                ? AttendanceStudentStatus.ABSENT
                : AttendanceStudentStatus.PRESENT;

        return AttendanceRecord.builder()
                .sessionId(sessionId)
                .studentId(student.id())
                .groupId(student.groupId())
                .firstName(student.firstName())
                .lastName(student.lastName())
                .email(student.email())
                .numApogee(student.numApogee())
                .status(status)
                .markMethod(status == AttendanceStudentStatus.PRESENT ? AttendanceSessionMethod.MANUAL : null)
                .markedAt(status == AttendanceStudentStatus.PRESENT ? endedAt.minusMinutes(20 + Math.floorMod(student.id(), 10)) : null)
                .deviceId(null)
                .markedGpsLat(null)
                .markedGpsLon(null)
                .build();
    }

    private AttendanceRecord toRecord(
            Long sessionId,
            AttendanceSessionMethod method,
            LocalDateTime endedAt,
            SeedStudent student,
            boolean absent) {
        return AttendanceRecord.builder()
                .sessionId(sessionId)
                .studentId(student.id())
                .groupId(student.groupId())
                .firstName(student.firstName())
                .lastName(student.lastName())
                .email(student.email())
                .numApogee(student.numApogee())
                .status(absent ? AttendanceStudentStatus.ABSENT : AttendanceStudentStatus.PRESENT)
                .markMethod(absent ? null : method)
                .markedAt(absent ? null : endedAt.minusMinutes(70 + Math.floorMod(student.id(), 12)))
                .deviceId(method == AttendanceSessionMethod.QR_CODE && !absent ? "seed-device-" + student.id() : null)
                .markedGpsLat(method == AttendanceSessionMethod.QR_CODE && !absent ? DEFAULT_GPS_LAT : null)
                .markedGpsLon(method == AttendanceSessionMethod.QR_CODE && !absent ? DEFAULT_GPS_LON : null)
                .build();
    }

    private record SeedStudent(
            Long id,
            Long groupId,
            String firstName,
            String lastName,
            String email,
            String numApogee
    ) {
    }
}
