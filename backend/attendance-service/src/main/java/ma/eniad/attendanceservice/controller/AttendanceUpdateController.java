package ma.eniad.attendanceservice.controller;

import jakarta.validation.Valid;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.dto.InternalAttendanceUpdateRequest;
import ma.eniad.attendanceservice.dto.ManualAttendanceUpdateRequest;
import ma.eniad.attendanceservice.service.AttendanceUpdateService;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/attendance")
public class AttendanceUpdateController {

    private final AttendanceUpdateService attendanceUpdateService;

    public AttendanceUpdateController(AttendanceUpdateService attendanceUpdateService) {
        this.attendanceUpdateService = attendanceUpdateService;
    }

    @RequireRole({"TEACHER"})
    @PostMapping("/sessions/{sessionId}/attendance")
    public ResponseEntity<AttendanceUpdateResponse> updateAttendanceManually(@PathVariable Long sessionId,
                                                                             @Valid @RequestBody ManualAttendanceUpdateRequest request) {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceUpdateService.updateManualAttendance(teacherId, sessionId, request));
    }

    @PostMapping("/internal/sessions/{sessionId}/attendance")
    public ResponseEntity<AttendanceUpdateResponse> updateAttendanceInternally(@PathVariable Long sessionId,
                                                                               @RequestHeader(value = "X-Request-Source", required = false) String requestSource,
                                                                               @Valid @RequestBody InternalAttendanceUpdateRequest request) {
        return ResponseEntity.ok(attendanceUpdateService.updateInternalAttendance(requestSource, sessionId, request));
    }
}
