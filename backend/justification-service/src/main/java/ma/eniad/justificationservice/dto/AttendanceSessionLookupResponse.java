package ma.eniad.justificationservice.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceSessionLookupResponse(
        Long sessionId,
        Long teacherId,
        String teacherFullName,
        List<Long> groupIds,
        String courseLabel,
        String roomLabel,
        String gpsLat,
        String gpsLon,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        LocalDateTime endedAt,
        String status,
        int presentCount,
        int absentCount,
        int unknownCount,
        List<Object> students
) {
}
