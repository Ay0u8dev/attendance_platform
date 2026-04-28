package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.client.UserServiceClient;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import ma.eniad.attendanceservice.service.LiveAttendanceSessionStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttendanceSessionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AttendanceSessionRepository attendanceSessionRepository;

    @MockitoBean
    private UserServiceClient userServiceClient;

    @MockitoBean
    private LiveAttendanceSessionStore liveAttendanceSessionStore;

    @BeforeEach
    void setUp() {
        attendanceSessionRepository.deleteAll();
    }

    @Test
    void createSessionSucceedsForTeacher() throws Exception {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L, 2L))).thenReturn(List.of(
                new StudentRosterDto(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "A001"),
                new StudentRosterDto(11L, 2L, "Yassine", "Fassi", "yassine@ump.ac.ma", "A002")
        ));

        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma")
                        .content("""
                                {
                                  "groupIds": [1, 2],
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teacherId").value(77))
                .andExpect(jsonPath("$.courseLabel").value("Distributed Systems"))
                .andExpect(jsonPath("$.roomLabel").value("Room B12"))
                .andExpect(jsonPath("$.gpsLat").value("34.6814"))
                .andExpect(jsonPath("$.gpsLon").value("-1.9086"))
                .andExpect(jsonPath("$.method").value("QR_CODE"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.studentCount").value(2));

        List<AttendanceSession> sessions = attendanceSessionRepository.findAll();
        assertThat(sessions).hasSize(1);
        AttendanceSession session = sessions.getFirst();
        assertThat(session.getTeacherId()).isEqualTo(77L);
        assertThat(session.getStatus()).isEqualTo(AttendanceSessionStatus.ACTIVE);
        assertThat(session.getGroupIds()).containsExactly(1L, 2L);
        assertThat(session.getGpsLat()).isEqualTo("34.6814");
        assertThat(session.getGpsLon()).isEqualTo("-1.9086");
        assertThat(session.getMethod().name()).isEqualTo("QR_CODE");
        assertThat(Duration.between(session.getStartedAt(), session.getEndsAt())).isEqualTo(Duration.ofMinutes(30));

        var metaCaptor = org.mockito.ArgumentCaptor.forClass(LiveAttendanceSessionMeta.class);
        @SuppressWarnings("unchecked")
        var studentsCaptor = org.mockito.ArgumentCaptor.forClass((Class<List<LiveAttendanceStudentState>>) (Class<?>) List.class);
        verify(liveAttendanceSessionStore).initializeSession(metaCaptor.capture(), studentsCaptor.capture());
        assertThat(metaCaptor.getValue()).isNotNull();
        assertThat(metaCaptor.getValue().groupIds()).containsExactly(1L, 2L);
        assertThat(metaCaptor.getValue().gpsLat()).isEqualTo("34.6814");
        assertThat(metaCaptor.getValue().gpsLon()).isEqualTo("-1.9086");
        assertThat(metaCaptor.getValue().method().name()).isEqualTo("QR_CODE");
        assertThat(studentsCaptor.getValue()).hasSize(2);
        assertThat(studentsCaptor.getValue().get(0).email()).isEqualTo("aya@ump.ac.ma");
        assertThat(studentsCaptor.getValue().get(0).numApogee()).isEqualTo("A001");
        assertThat(studentsCaptor.getValue())
                .allMatch(student -> student.status() == AttendanceStudentStatus.UNKNOWN
                        && student.markedAt() == null
                        && student.markMethod() == null
                        && student.deviceId() == null);
    }

    @Test
    void createSessionRejectsMissingGroupIds() throws Exception {
        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSessionRejectsBlankCourseLabel() throws Exception {
        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "groupIds": [1],
                                  "courseLabel": "   ",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSessionRejectsBlankRoomLabel() throws Exception {
        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "groupIds": [1],
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "   ",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSessionRejectsCallerWithoutTeacherRole() throws Exception {
        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "ADMIN")
                        .content("""
                                {
                                  "groupIds": [1],
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void createSessionRejectsSecondActiveSessionForTeacher() throws Exception {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L))).thenReturn(List.of());

        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "groupIds": [1],
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "groupIds": [2],
                                  "courseLabel": "OS",
                                  "roomLabel": "Room C03",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "FACE_ID"
                                }
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void createSessionDoesNotPersistWhenRosterLookupFails() throws Exception {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L)))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "No active academic year found"));

        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "groupIds": [1],
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isConflict());

        assertThat(attendanceSessionRepository.count()).isZero();
    }

    @Test
    void createSessionDeletesPersistedSessionWhenRedisInitializationFails() throws Exception {
        when(userServiceClient.getStudentRosterByGroupIds(List.of(1L)))
                .thenReturn(List.of(new StudentRosterDto(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "A001")));
        doThrow(new RuntimeException("Redis unavailable"))
                .when(liveAttendanceSessionStore)
                .initializeSession(any(LiveAttendanceSessionMeta.class), any());

        mockMvc.perform(post("/attendance/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .content("""
                                {
                                  "groupIds": [1],
                                  "courseLabel": "Distributed Systems",
                                  "roomLabel": "Room B12",
                                  "gpsLat": "34.6814",
                                  "gpsLon": "-1.9086",
                                  "method": "QR_CODE"
                                }
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Failed to initialize live session state"));

        assertThat(attendanceSessionRepository.count()).isZero();
    }
}
