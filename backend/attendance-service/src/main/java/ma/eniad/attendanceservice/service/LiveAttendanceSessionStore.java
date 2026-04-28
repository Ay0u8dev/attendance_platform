package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;

import java.util.List;
import java.util.Optional;

public interface LiveAttendanceSessionStore {
    void initializeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students);

    Optional<LiveAttendanceSessionMeta> findSessionMeta(Long sessionId);

    Optional<LiveAttendanceStudentState> findStudentState(Long sessionId, Long studentId);

    Optional<Long> findStudentIdByDevice(Long sessionId, String deviceId);

    Optional<String> findDeviceIdByStudent(Long sessionId, Long studentId);

    void saveStudentState(Long sessionId, LiveAttendanceStudentState studentState);

    void bindDeviceToStudent(Long sessionId, String deviceId, Long studentId);

    AttendanceCounts getAttendanceCounts(Long sessionId);
}
