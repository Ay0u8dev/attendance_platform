package ma.eniad.attendanceservice.service;

import lombok.AllArgsConstructor;
import ma.eniad.attendanceservice.client.UserServiceClient;
import ma.eniad.attendanceservice.config.AttendanceSessionProperties;
import ma.eniad.attendanceservice.dto.*;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@Service
public class AttendanceSessionService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final UserServiceClient userServiceClient;
    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final AttendanceSessionProperties attendanceSessionProperties;

    @Transactional
    public AttendanceSessionResponse createSession(Long teacherId, CreateAttendanceSessionRequest request) {
        if (attendanceSessionRepository.existsByTeacherIdAndStatus(teacherId, AttendanceSessionStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Teacher already has an active session");
        }

        List<Long> normalizedGroupIds = request.groupIds().stream().distinct().toList();
        List<StudentRosterDto> roster = userServiceClient.getStudentRosterByGroupIds(normalizedGroupIds);

        LocalDateTime startedAt = LocalDateTime.now();
        LocalDateTime endsAt = startedAt.plus(attendanceSessionProperties.autoEndDuration());

        AttendanceSession session = AttendanceSession.builder()
                .teacherId(teacherId)
                .courseLabel(request.courseLabel().trim())
                .roomLabel(request.roomLabel().trim())
                .gpsLat(request.gpsLat().trim())
                .gpsLon(request.gpsLon().trim())
                .method(request.method())
                .startedAt(startedAt)
                .endsAt(endsAt)
                .status(AttendanceSessionStatus.ACTIVE)
                .presentCount(0)
                .absentCount(0)
                .unknownCount(roster.size())
                .groupIds(normalizedGroupIds)
                .build();

        AttendanceSession savedSession = attendanceSessionRepository.saveAndFlush(session);

        try {
            liveAttendanceSessionStore.initializeSession(
                    new LiveAttendanceSessionMeta(
                            savedSession.getId(),
                            savedSession.getTeacherId(),
                            List.copyOf(savedSession.getGroupIds()),
                            savedSession.getCourseLabel(),
                            savedSession.getRoomLabel(),
                            savedSession.getGpsLat(),
                            savedSession.getGpsLon(),
                            savedSession.getStartedAt(),
                            savedSession.getEndsAt(),
                            savedSession.getMethod(),
                            savedSession.getStatus()
                    ),
                    roster.stream()
                            .map(student -> new LiveAttendanceStudentState(
                                    student.studentId(),
                                    student.groupId(),
                                    student.firstName(),
                                    student.lastName(),
                                    student.email(),
                                    student.numApogee(),
                                    AttendanceStudentStatus.UNKNOWN,
                                    null,
                                    null,
                                    null,
                                    null,
                                    null
                            ))
                            .toList()
            );
        } catch (RuntimeException ex) {
            attendanceSessionRepository.delete(savedSession);
            attendanceSessionRepository.flush();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to initialize live session state");
        }

        return new AttendanceSessionResponse(
                savedSession.getId(),
                savedSession.getTeacherId(),
                List.copyOf(savedSession.getGroupIds()),
                savedSession.getCourseLabel(),
                savedSession.getRoomLabel(),
                savedSession.getGpsLat(),
                savedSession.getGpsLon(),
                savedSession.getStartedAt(),
                savedSession.getEndsAt(),
                savedSession.getMethod(),
                savedSession.getStatus(),
                roster.size()
        );
    }
}
