package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

public interface LiveAttendanceSessionStore {
    void initializeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students);

    Optional<LiveAttendanceSessionMeta> findSessionMeta(Long sessionId);

    Optional<LiveAttendanceStudentState> findStudentState(Long sessionId, Long studentId);

    List<LiveAttendanceStudentState> findAllStudentStates(Long sessionId);

    Optional<Long> findStudentIdByDevice(Long sessionId, String deviceId);

    Optional<String> findDeviceIdByStudent(Long sessionId, Long studentId);

    void saveStudentState(Long sessionId, LiveAttendanceStudentState studentState);

    void bindDeviceToStudent(Long sessionId, String deviceId, Long studentId);

    default void saveStudentStateAndBindDevice(
            Long sessionId,
            LiveAttendanceStudentState studentState,
            String deviceId,
            Long studentId
    ) {
        saveStudentState(sessionId, studentState);
        bindDeviceToStudent(sessionId, deviceId, studentId);
    }

    AttendanceCounts getAttendanceCounts(Long sessionId);

    void finalizeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students, Duration retention);

    /**
     * Atomically binds a device to a student only if the device is not already bound.
     * Default implementation is NOT atomic and has a race condition.
     * Implementations MUST override this method with an atomic operation.
     */
    default boolean bindDeviceToStudentIfAbsent(Long sessionId, String deviceId, Long studentId) {
        if (findStudentIdByDevice(sessionId, deviceId).isPresent()) {
            return false;
        }
        bindDeviceToStudent(sessionId, deviceId, studentId);
        return true;
    }
}
