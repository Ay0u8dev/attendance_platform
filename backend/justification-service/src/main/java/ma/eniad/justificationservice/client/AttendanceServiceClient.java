package ma.eniad.justificationservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import ma.eniad.justificationservice.dto.AttendanceSessionLookupResponse;
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;

@FeignClient(name = "attendance-service", url = "${services.attendance-service.url:http://localhost}")
public interface AttendanceServiceClient {

    @PatchMapping("/attendance/internal/sessions/{sessionId}/students/{studentId}/justify")
    void justifyAbsence(@PathVariable("sessionId") Long sessionId,
                        @PathVariable("studentId") Long studentId,
                        @RequestHeader(value = "X-Request-Source") String requestSource,
                        @RequestBody AttendanceJustificationRequest request);

    @GetMapping("/attendance/internal/sessions/{sessionId}")
    AttendanceSessionLookupResponse getSession(@PathVariable("sessionId") Long sessionId,
                                                @RequestHeader(value = "X-Request-Source") String requestSource);
}
