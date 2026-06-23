package ma.eniad.justificationservice.client;

import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "attendance-service", url = "${services.attendance-service.url:http://localhost}")
public interface AttendanceServiceClient {

    @PatchMapping("/api/attendance/internal/sessions/{sessionId}/students/{studentId}/justify")
    void justifyAbsence(@PathVariable("sessionId") Long sessionId,
                        @PathVariable("studentId") Long studentId,
                        @RequestHeader(value = "X-Request-Source") String requestSource,
                        @RequestBody AttendanceJustificationRequest request);
}
