package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    static String sessionMetaKey(Long sessionId) {
        return "attendance:session:" + sessionId + ":meta";
    }

    static String sessionStudentsKey(Long sessionId) {
        return "attendance:session:" + sessionId + ":students";
    }

    static String teacherActiveSessionKey(Long teacherId) {
        return "attendance:teacher:" + teacherId + ":active-session";
    }
}
