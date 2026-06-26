package ma.eniad.attendanceservice.service;

import java.util.function.Supplier;

public interface AttendanceSessionLock {
    <T> T execute(Long sessionId, Supplier<T> operation);
}
