package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RedisLiveAttendanceSessionStoreTest {

    @Test
    void findSessionMetaConvertsLinkedHashMapPayload() {
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        ValueOperations<String, Object> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        LiveAttendanceSessionMeta expected = new LiveAttendanceSessionMeta(
                100L,
                77L,
                List.of(1L, 2L),
                "Distributed Systems",
                "Room B12",
                "34.6814",
                "-1.9086",
                LocalDateTime.of(2026, 5, 2, 15, 0),
                LocalDateTime.of(2026, 5, 2, 15, 30),
                AttendanceSessionMethod.QR_CODE,
                AttendanceSessionStatus.ACTIVE
        );
        when(valueOperations.get(RedisLiveAttendanceSessionStore.sessionMetaKey(100L)))
                .thenReturn(new ObjectMapper().convertValue(expected, LinkedHashMap.class));

        RedisLiveAttendanceSessionStore store = new RedisLiveAttendanceSessionStore(redisTemplate, new ObjectMapper());

        Optional<LiveAttendanceSessionMeta> result = store.findSessionMeta(100L);

        assertThat(result).contains(expected);
    }

    @Test
    void findAllStudentStatesConvertsLinkedHashMapPayloads() {
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        HashOperations<String, Object, Object> hashOperations = mock(HashOperations.class);
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);

        LiveAttendanceStudentState student = new LiveAttendanceStudentState(
                10L,
                1L,
                "Aya",
                "Bennani",
                "aya@ump.ac.ma",
                "https://cdn.example.com/aya.jpg",
                "A001",
                AttendanceStudentStatus.PRESENT,
                LocalDateTime.of(2026, 5, 2, 15, 10),
                AttendanceSessionMethod.QR_CODE,
                "phone-10",
                "34.6820",
                "-1.9091"
        );
        when(hashOperations.values(RedisLiveAttendanceSessionStore.sessionStudentsKey(100L)))
                .thenReturn(List.of(new ObjectMapper().convertValue(student, LinkedHashMap.class)));

        RedisLiveAttendanceSessionStore store = new RedisLiveAttendanceSessionStore(redisTemplate, new ObjectMapper());

        List<LiveAttendanceStudentState> result = store.findAllStudentStates(100L);

        assertThat(result).containsExactly(student);
    }
}
