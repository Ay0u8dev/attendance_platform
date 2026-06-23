package ma.eniad.attendanceservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public class RedisAttendanceSessionLock implements AttendanceSessionLock {
    private static final DefaultRedisScript<Long> RELEASE_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then "
                    + "return redis.call('del', KEYS[1]) else return 0 end",
            Long.class
    );

    private final StringRedisTemplate redisTemplate;
    private final Duration leaseDuration;
    private final Duration acquireTimeout;
    private final Duration retryInterval;

    public RedisAttendanceSessionLock(
            StringRedisTemplate redisTemplate,
            @Value("${attendance.lock.lease-duration:PT2M}") Duration leaseDuration,
            @Value("${attendance.lock.acquire-timeout:PT2S}") Duration acquireTimeout,
            @Value("${attendance.lock.retry-interval:PT0.05S}") Duration retryInterval
    ) {
        this.redisTemplate = redisTemplate;
        this.leaseDuration = leaseDuration;
        this.acquireTimeout = acquireTimeout;
        this.retryInterval = retryInterval;
    }

    @Override
    public <T> T execute(Long sessionId, Supplier<T> operation) {
        String key = "attendance:session:" + sessionId + ":lock";
        String ownerToken = UUID.randomUUID().toString();
        long deadline = System.nanoTime() + acquireTimeout.toNanos();

        try {
            while (!Boolean.TRUE.equals(redisTemplate.opsForValue()
                    .setIfAbsent(key, ownerToken, leaseDuration))) {
                if (System.nanoTime() >= deadline) {
                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Attendance session is temporarily busy"
                    );
                }
                sleepBeforeRetry();
            }

            try {
                return operation.get();
            } finally {
                redisTemplate.execute(RELEASE_SCRIPT, List.of(key), ownerToken);
            }
        } catch (RedisConnectionFailureException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Attendance coordination is unavailable",
                    ex
            );
        }
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(retryInterval.toMillis());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Attendance coordination was interrupted",
                    ex
            );
        }
    }
}
