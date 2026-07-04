package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AttendanceRecordRepositoryTest {

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private AttendanceSessionRepository attendanceSessionRepository;

    @Test
    void countFinalizedAbsencesForStudentAndCourseCountsOnlyFinalizedAbsencesInSameCourse() {
        AttendanceSession finalizedDistributedSystems = saveSession("Distributed Systems", AttendanceSessionStatus.FINALIZED);
        AttendanceSession activeDistributedSystems = saveSession("Distributed Systems", AttendanceSessionStatus.ACTIVE);
        AttendanceSession finalizedNetworks = saveSession("Networks", AttendanceSessionStatus.FINALIZED);

        attendanceRecordRepository.saveAll(List.of(
                record(finalizedDistributedSystems.getId(), 11L, AttendanceStudentStatus.ABSENT),
                record(finalizedDistributedSystems.getId(), 11L, AttendanceStudentStatus.PRESENT),
                record(activeDistributedSystems.getId(), 11L, AttendanceStudentStatus.ABSENT),
                record(finalizedNetworks.getId(), 11L, AttendanceStudentStatus.ABSENT),
                record(finalizedDistributedSystems.getId(), 12L, AttendanceStudentStatus.ABSENT)
        ));

        long count = attendanceRecordRepository.countFinalizedAbsencesForStudentAndCourse(
                11L,
                "distributed systems"
        );

        assertThat(count).isEqualTo(1L);
    }

    private AttendanceSession saveSession(String courseLabel, AttendanceSessionStatus status) {
        LocalDateTime startedAt = LocalDateTime.of(2026, 7, 4, 9, 0);
        return attendanceSessionRepository.save(AttendanceSession.builder()
                .courseLabel(courseLabel)
                .roomLabel("B2")
                .startedAt(startedAt)
                .endsAt(startedAt.plusHours(2))
                .status(status)
                .method(AttendanceSessionMethod.MANUAL)
                .teacherId(99L)
                .groupIds(List.of(1L))
                .build());
    }

    private AttendanceRecord record(Long sessionId, Long studentId, AttendanceStudentStatus status) {
        return AttendanceRecord.builder()
                .sessionId(sessionId)
                .studentId(studentId)
                .groupId(1L)
                .firstName("Mariam")
                .lastName("Fahim")
                .email("mariam.fahim@ump.ac.ma")
                .numApogee("A-" + studentId)
                .status(status)
                .build();
    }
}
