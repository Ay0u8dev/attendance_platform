package ma.eniad.attendanceservice.controller;

import jakarta.validation.Valid;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.dto.InternalAttendanceUpdateRequest;
import ma.eniad.attendanceservice.dto.JustifyAbsenceRequest;
import ma.eniad.attendanceservice.dto.ManualAttendanceUpdateRequest;
import ma.eniad.attendanceservice.service.AttendanceUpdateService;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
        var currentUser = UserContext.getCurrentUser();
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User context not available");
        }
        Long teacherId = Long.valueOf(currentUser.userId());
        return ResponseEntity.ok(attendanceUpdateService.updateManualAttendance(teacherId, sessionId, request));
    }

    @PostMapping("/internal/sessions/{sessionId}/attendance")
    public ResponseEntity<AttendanceUpdateResponse> updateAttendanceInternally(@PathVariable Long sessionId,
                                                                               @RequestHeader(value = "X-Request-Source", required = false) String requestSource,
                                                                               @Valid @RequestBody InternalAttendanceUpdateRequest request) {
        return ResponseEntity.ok(attendanceUpdateService.updateInternalAttendance(requestSource, sessionId, request));
    }

    @PatchMapping("/internal/sessions/{sessionId}/students/{studentId}/justify")
    public ResponseEntity<Void> justifyAbsenceInternally(@PathVariable Long sessionId,
                                                         @PathVariable Long studentId,
                                                         @RequestHeader(value = "X-Request-Source", required = false) String requestSource,
                                                         @Valid @RequestBody JustifyAbsenceRequest request) {
        attendanceUpdateService.justifyFinalizedAbsence(requestSource, sessionId, studentId, request);
        return ResponseEntity.noContent().build();
    }
}
