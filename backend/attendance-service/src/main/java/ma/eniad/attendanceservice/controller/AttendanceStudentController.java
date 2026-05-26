package ma.eniad.attendanceservice.controller;

import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.dto.StudentActiveAttendanceSessionResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceOverviewResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceSessionDetailResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.service.AttendanceQueryService;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/attendance/student")
public class AttendanceStudentController {

    private final AttendanceQueryService attendanceQueryService;

    @RequireRole({"STUDENT"})
    @GetMapping("/sessions")
    public ResponseEntity<PagedResponse<StudentAttendanceSessionSummaryResponse>> getSessions(
            @RequestParam(required = false) AttendanceStudentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            Pageable pageable
    ) {
        Long studentId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceQueryService.getStudentSessions(studentId, status, dateFrom, dateTo, pageable));
    }

    @RequireRole({"STUDENT"})
    @GetMapping("/sessions/active")
    public ResponseEntity<StudentActiveAttendanceSessionResponse> getActiveSession() {
        Long studentId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceQueryService.getActiveStudentSession(studentId));
    }

    @RequireRole({"STUDENT"})
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<StudentAttendanceSessionDetailResponse> getSession(@PathVariable Long sessionId) {
        Long studentId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceQueryService.getStudentSession(studentId, sessionId));
    }

    @RequireRole({"STUDENT"})
    @GetMapping("/overview")
    public ResponseEntity<StudentAttendanceOverviewResponse> getOverview() {
        Long studentId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceQueryService.getStudentOverview(studentId));
    }
}
