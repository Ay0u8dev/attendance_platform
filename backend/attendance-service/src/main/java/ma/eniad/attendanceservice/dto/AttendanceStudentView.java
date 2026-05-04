package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record AttendanceStudentView(
        @NotNull Long studentId,
        @NotNull Long groupId,
        @NotNull String firstName,
        @NotNull String lastName,
        @NotNull @Email String email,
        String pfpUrl,
        @NotNull String numApogee,
        @NotNull AttendanceStudentStatus status,
        AttendanceSessionMethod markMethod,
        String deviceId,
        String markedGpsLat,
        String markedGpsLon,
        LocalDateTime markedAt
) {
}
