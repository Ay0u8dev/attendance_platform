package ma.eniad.attendanceservice.controller;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.AttendanceSessionResponse;
import ma.eniad.attendanceservice.dto.CreateAttendanceSessionRequest;
import ma.eniad.attendanceservice.service.AttendanceSessionService;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@RequestMapping("/attendance/sessions")
public class AttendanceSessionController {

    private final AttendanceSessionService attendanceSessionService;

    @RequireRole({"TEACHER"})
    @PostMapping
    public ResponseEntity<AttendanceSessionResponse> createSession(
            @Valid @RequestBody CreateAttendanceSessionRequest request
    ) {
        Long teacherId = Long.valueOf(UserContext.getCurrentUser().userId());
        return ResponseEntity.ok(attendanceSessionService.createSession(teacherId, request));
    }
}
