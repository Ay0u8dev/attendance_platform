package ma.eniad.attendanceservice.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RedisAttendanceSessionLockTest {

    @Test
    void usesNxLeaseUniqueOwnersAndOwnerOnlyReleaseScript() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);

        RedisAttendanceSessionLock lock = new RedisAttendanceSessionLock(
                redis, Duration.ofMinutes(2), Duration.ofSeconds(2), Duration.ofMillis(1));

        assertThat(lock.execute(42L, () -> "first")).isEqualTo("first");
        assertThat(lock.execute(42L, () -> "second")).isEqualTo("second");

        ArgumentCaptor<String> owners = ArgumentCaptor.forClass(String.class);
        verify(values, times(2)).setIfAbsent(
                eq("attendance:session:42:lock"), owners.capture(), eq(Duration.ofMinutes(2)));
        assertThat(owners.getAllValues()).doesNotHaveDuplicates();

        @SuppressWarnings("rawtypes")
        ArgumentCaptor<DefaultRedisScript> script = ArgumentCaptor.forClass(DefaultRedisScript.class);
        verify(redis, times(2)).execute(script.capture(), eq(List.of("attendance:session:42:lock")), anyString());
        assertThat(script.getValue().getScriptAsString())
                .contains("get", "ARGV[1]", "del")
                .contains("else return 0");
    }

    @Test
    void updateCannotOverlapManualFinalization() throws Exception {
        assertOperationsAreSerialized("manual-finalization");
    }

    @Test
    void updateCannotOverlapScheduledFinalization() throws Exception {
        assertOperationsAreSerialized("scheduled-finalization");
    }

    private void assertOperationsAreSerialized(String secondResult) throws Exception {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> values = mock(ValueOperations.class);
        AtomicBoolean held = new AtomicBoolean();
        when(redis.opsForValue()).thenReturn(values);
        when(values.setIfAbsent(anyString(), anyString(), any(Duration.class)))
                .thenAnswer(invocation -> held.compareAndSet(false, true));
        when(redis.execute(any(DefaultRedisScript.class), anyList(), anyString()))
                .thenAnswer(invocation -> {
                    held.set(false);
                    return 1L;
                });

        RedisAttendanceSessionLock lock = new RedisAttendanceSessionLock(
                redis, Duration.ofMinutes(2), Duration.ofSeconds(2), Duration.ofMillis(1));
        CountDownLatch updateEntered = new CountDownLatch(1);
        CountDownLatch releaseUpdate = new CountDownLatch(1);
        CountDownLatch finalizationEntered = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var update = executor.submit(() -> lock.execute(42L, () -> {
                updateEntered.countDown();
                await(releaseUpdate);
                return "update";
            }));
            assertThat(updateEntered.await(1, TimeUnit.SECONDS)).isTrue();

            var finalization = executor.submit(() -> lock.execute(42L, () -> {
                finalizationEntered.countDown();
                return secondResult;
            }));
            assertThat(finalizationEntered.await(50, TimeUnit.MILLISECONDS)).isFalse();
            releaseUpdate.countDown();

            assertThat(update.get(1, TimeUnit.SECONDS)).isEqualTo("update");
            assertThat(finalization.get(1, TimeUnit.SECONDS)).isEqualTo(secondResult);
        } finally {
            executor.shutdownNow();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }
}
