package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;

import java.util.List;

public interface LiveAttendanceSessionStore {
    void initializeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students);
}
