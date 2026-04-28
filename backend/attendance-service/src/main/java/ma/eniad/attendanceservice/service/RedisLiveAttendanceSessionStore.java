package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RedisLiveAttendanceSessionStore implements LiveAttendanceSessionStore {

    private final RedisTemplate<String, Object> redisTemplate;

    public RedisLiveAttendanceSessionStore(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void initializeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students) {
        String metaKey = sessionMetaKey(meta.sessionId());
        String studentsKey = sessionStudentsKey(meta.sessionId());
        String teacherKey = teacherActiveSessionKey(meta.teacherId());

        try {
            redisTemplate.opsForValue().set(metaKey, meta);
            redisTemplate.opsForValue().set(teacherKey, meta.sessionId());

            if (!students.isEmpty()) {
                Map<String, Object> states = new LinkedHashMap<>();
                for (LiveAttendanceStudentState student : students) {
                    states.put(student.studentId().toString(), student);
                }
                redisTemplate.opsForHash().putAll(studentsKey, states);
            }
        } catch (RuntimeException ex) {
            redisTemplate.delete(List.of(metaKey, studentsKey, teacherKey));
            throw ex;
        }
    }

    @Override
    public Optional<LiveAttendanceSessionMeta> findSessionMeta(Long sessionId) {
        Object value = redisTemplate.opsForValue().get(sessionMetaKey(sessionId));
        return Optional.ofNullable((LiveAttendanceSessionMeta) value);
    }

    @Override
    public Optional<LiveAttendanceStudentState> findStudentState(Long sessionId, Long studentId) {
        Object value = redisTemplate.opsForHash().get(sessionStudentsKey(sessionId), studentId.toString());
        return Optional.ofNullable((LiveAttendanceStudentState) value);
    }

    @Override
    public Optional<Long> findStudentIdByDevice(Long sessionId, String deviceId) {
        Object value = redisTemplate.opsForHash().get(sessionDevicesKey(sessionId), deviceId);
        if (value == null) {
            return Optional.empty();
        }
        if (value instanceof Long longValue) {
            return Optional.of(longValue);
        }
        if (value instanceof Integer intValue) {
            return Optional.of(intValue.longValue());
        }
        return Optional.of(Long.valueOf(value.toString()));
    }

    @Override
    public Optional<String> findDeviceIdByStudent(Long sessionId, Long studentId) {
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(sessionDevicesKey(sessionId));
        for (Map.Entry<Object, Object> entry : entries.entrySet()) {
            Long mappedStudentId;
            Object value = entry.getValue();
            if (value instanceof Long longValue) {
                mappedStudentId = longValue;
            } else if (value instanceof Integer intValue) {
                mappedStudentId = intValue.longValue();
            } else {
                mappedStudentId = Long.valueOf(value.toString());
            }

            if (studentId.equals(mappedStudentId)) {
                return Optional.of(entry.getKey().toString());
            }
        }
        return Optional.empty();
    }

    @Override
    public void saveStudentState(Long sessionId, LiveAttendanceStudentState studentState) {
        redisTemplate.opsForHash().put(
                sessionStudentsKey(sessionId),
                studentState.studentId().toString(),
                studentState
        );
    }

    @Override
    public void bindDeviceToStudent(Long sessionId, String deviceId, Long studentId) {
        redisTemplate.opsForHash().put(sessionDevicesKey(sessionId), deviceId, studentId);
    }

    @Override
    public AttendanceCounts getAttendanceCounts(Long sessionId) {
        List<Object> values = redisTemplate.opsForHash().values(sessionStudentsKey(sessionId));
        int present = 0;
        int absent = 0;
        int unknown = 0;

        for (Object value : values) {
            LiveAttendanceStudentState studentState = (LiveAttendanceStudentState) value;
            if (studentState.status() == AttendanceStudentStatus.PRESENT) {
                present++;
            } else if (studentState.status() == AttendanceStudentStatus.ABSENT) {
                absent++;
            } else {
                unknown++;
            }
        }

        return new AttendanceCounts(present, absent, unknown);
    }

    static String sessionMetaKey(Long sessionId) {
        return "attendance:session:" + sessionId + ":meta";
    }

    static String sessionStudentsKey(Long sessionId) {
        return "attendance:session:" + sessionId + ":students";
    }

    static String sessionDevicesKey(Long sessionId) {
        return "attendance:session:" + sessionId + ":devices";
    }

    static String teacherActiveSessionKey(Long teacherId) {
        return "attendance:teacher:" + teacherId + ":active-session";
    }
}
