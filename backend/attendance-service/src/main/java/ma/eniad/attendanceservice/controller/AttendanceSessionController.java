package ma.eniad.attendanceservice.controller;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.AttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionResponse;
import ma.eniad.attendanceservice.dto.CreateAttendanceSessionRequest;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.service.AttendanceFinalizationService;
import ma.eniad.attendanceservice.service.AttendanceQueryService;
import ma.eniad.attendanceservice.service.AttendanceSessionReadService;
import ma.eniad.attendanceservice.service.AttendanceSessionService;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@AllArgsConstructor
@RequestMapping("/attendance/sessions")
public class AttendanceSessionController {

    private final AttendanceSessionService attendanceSessionService;
    private final AttendanceSessionReadService attendanceSessionReadService;
    private final AttendanceFinalizationService attendanceFinalizationService;
    private final AttendanceQueryService attendanceQueryService;

    @RequireRole({"TEACHER"})
    @PostMapping
    public ResponseEntity<AttendanceSessionResponse> createSession(
            @Valid @RequestBody CreateAttendanceSessionRequest request
    ) {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceSessionService.createSession(teacherId, request));
    }

    @RequireRole({"TEACHER"})
    @GetMapping
    public ResponseEntity<PagedResponse<AttendanceSessionSummaryResponse>> getTeacherSessions(
            @RequestParam(required = false) AttendanceSessionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            Pageable pageable
    ) {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceQueryService.getTeacherSessions(teacherId, status, dateFrom, dateTo, pageable));
    }

    @RequireRole({"TEACHER"})
    @GetMapping("/active")
    public ResponseEntity<AttendanceSessionDetailsResponse> getActiveSession() {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceQueryService.getActiveTeacherSession(teacherId));
    }

    @RequireRole({"TEACHER"})
    @GetMapping("/{sessionId}")
    public ResponseEntity<AttendanceSessionDetailsResponse> getSession(@PathVariable Long sessionId) {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceSessionReadService.getSession(sessionId, teacherId));
    }

    @RequireRole({"TEACHER"})
    @PostMapping("/{sessionId}/end")
    public ResponseEntity<AttendanceSessionDetailsResponse> endSession(@PathVariable Long sessionId) {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceFinalizationService.finalizeSession(sessionId, teacherId));
    }
}
