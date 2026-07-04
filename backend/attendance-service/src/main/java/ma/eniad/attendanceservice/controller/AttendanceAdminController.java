package ma.eniad.attendanceservice.controller;

import lombok.AllArgsConstructor;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.AdminOverviewResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;
import ma.eniad.attendanceservice.service.AttendanceQueryService;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@AllArgsConstructor
@RequestMapping("/attendance/admin")
public class AttendanceAdminController {

    private final AttendanceQueryService attendanceQueryService;

    @RequireRole({"ADMIN"})
    @GetMapping("/sessions")
    public ResponseEntity<PagedResponse<AttendanceSessionSummaryResponse>> getSessions(
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) AttendanceSessionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            Pageable pageable
    ) {
        return ResponseEntity.ok(attendanceQueryService.getAdminSessions(teacherId, groupId, status, dateFrom, dateTo, pageable));
    }

    @RequireRole({"ADMIN"})
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<AttendanceSessionDetailsResponse> getSession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(attendanceQueryService.getAdminSession(sessionId));
    }

    @RequireRole({"ADMIN"})
    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewResponse> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        return ResponseEntity.ok(attendanceQueryService.getAdminOverview(dateFrom, dateTo));
    }
}
