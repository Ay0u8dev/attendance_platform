package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.config.RoleCheckInterceptor;
import ma.eniad.attendanceservice.config.WebConfig;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.dto.AttendanceStudentView;
import ma.eniad.attendanceservice.dto.CreateAttendanceSessionRequest;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.exception.GlobalExceptionHandler;
import ma.eniad.attendanceservice.service.AttendanceFinalizationService;
import ma.eniad.attendanceservice.service.AttendanceQueryService;
import ma.eniad.attendanceservice.service.AttendanceSessionReadService;
import ma.eniad.attendanceservice.service.AttendanceSessionService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

import static ma.eniad.attendanceservice.controller.TestRequestHeaders.teacherUser;
import static ma.eniad.attendanceservice.controller.TestRequestHeaders.user;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AttendanceSessionController.class)
@Import({WebConfig.class, RoleCheckInterceptor.class, GlobalExceptionHandler.class})
class AttendanceSessionControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceSessionService attendanceSessionService;

    @MockitoBean
    private AttendanceSessionReadService attendanceSessionReadService;

    @MockitoBean
    private AttendanceFinalizationService attendanceFinalizationService;

    @MockitoBean
    private AttendanceQueryService attendanceQueryService;

    @Test
    void createSessionSucceedsForTeacher() throws Exception {
        when(attendanceSessionService.createSession(eq(77L), any(CreateAttendanceSessionRequest.class)))
                .thenReturn(new AttendanceSessionResponse(
                        100L, 77L, List.of(1L, 2L), "Distributed Systems", "Room B12",
                        "34.6814", "-1.9086", LocalDateTime.of(2026, 4, 28, 12, 0),
                        LocalDateTime.of(2026, 4, 28, 12, 30), AttendanceSessionMethod.QR_CODE,
                        AttendanceSessionStatus.ACTIVE, 2
                ));

        mockMvc.perform(post("/attendance/sessions")
                        .with(teacherUser())
                        .contentType(APPLICATION_JSON)
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
                .andExpect(jsonPath("$.groupIds[0]").value(1))
                .andExpect(jsonPath("$.courseLabel").value("Distributed Systems"))
                .andExpect(jsonPath("$.method").value("QR_CODE"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.studentCount").value(2));
    }

    @ParameterizedTest
    @MethodSource("invalidCreateRequests")
    void createSessionRejectsInvalidRequest(String requestBody, String message) throws Exception {
        mockMvc.perform(post("/attendance/sessions")
                        .with(teacherUser())
                        .contentType(APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(message));
    }

    @ParameterizedTest
    @MethodSource("teacherProtectedRequests")
    void teacherEndpointsRejectCallerWithoutTeacherRole(RequestSpec requestSpec) throws Exception {
        mockMvc.perform(requestSpec.builder().with(user("1", "ADMIN", "admin@ump.ac.ma")))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacherHistoryBindsFiltersAndPagination() throws Exception {
        when(attendanceQueryService.getTeacherSessions(eq(77L), eq(AttendanceSessionStatus.ACTIVE),
                eq(LocalDate.of(2026, 4, 1)), eq(LocalDate.of(2026, 4, 30)), any(Pageable.class)))
                .thenReturn(new PagedResponse<>(
                        List.of(new AttendanceSessionSummaryResponse(
                                100L, "Distributed Systems", "Room B12", List.of(1L),
                                AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.ACTIVE,
                                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                                null, 1, 0, 1
                        )),
                        1, 5, 1, 1
                ));

        mockMvc.perform(get("/attendance/sessions")
                        .with(teacherUser())
                        .param("status", "ACTIVE")
                        .param("dateFrom", "2026-04-01")
                        .param("dateTo", "2026-04-30")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sessionId").value(100));

        verify(attendanceQueryService).getTeacherSessions(
                eq(77L),
                eq(AttendanceSessionStatus.ACTIVE),
                eq(LocalDate.of(2026, 4, 1)),
                eq(LocalDate.of(2026, 4, 30)),
                any(Pageable.class)
        );
    }

    @Test
    void getActiveSessionReturnsTeacherView() throws Exception {
        when(attendanceQueryService.getActiveTeacherSession(77L)).thenReturn(new AttendanceSessionDetailsResponse(
                100L, 77L, List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30), null,
                AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.ACTIVE, 1, 0, 1, List.of()
        ));

        mockMvc.perform(get("/attendance/sessions/active").with(teacherUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(100))
                .andExpect(jsonPath("$.presentCount").value(1));
    }

    @Test
    void getSessionReturnsTeacherView() throws Exception {
        when(attendanceSessionReadService.getSession(100L, 77L)).thenReturn(new AttendanceSessionDetailsResponse(
                100L, 77L, List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30), null,
                AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.ACTIVE, 1, 0, 1,
                List.of(new AttendanceStudentView(
                        10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "https://cdn.example.com/aya.jpg", "A001",
                        AttendanceStudentStatus.PRESENT, AttendanceSessionMethod.QR_CODE, "phone-10",
                        "34.6820", "-1.9091", LocalDateTime.of(2026, 4, 28, 12, 5)
                ))
        ));

        mockMvc.perform(get("/attendance/sessions/100").with(teacherUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(100))
                .andExpect(jsonPath("$.students[0].markedGpsLat").value("34.6820"));
    }

    @Test
    void endSessionReturnsFinalizedTeacherView() throws Exception {
        when(attendanceFinalizationService.finalizeSession(100L, 77L)).thenReturn(new AttendanceSessionDetailsResponse(
                100L, 77L, List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                LocalDateTime.of(2026, 4, 28, 12, 30), AttendanceSessionMethod.QR_CODE,
                AttendanceSessionStatus.FINALIZED, 1, 1, 0, List.of()
        ));

        mockMvc.perform(post("/attendance/sessions/100/end").with(teacherUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FINALIZED"))
                .andExpect(jsonPath("$.unknownCount").value(0));
    }

    private static Stream<RequestSpec> teacherProtectedRequests() {
        return Stream.of(
                new RequestSpec(post("/attendance/sessions").contentType(APPLICATION_JSON).content(validCreateRequestJson())),
                new RequestSpec(get("/attendance/sessions")),
                new RequestSpec(get("/attendance/sessions/active")),
                new RequestSpec(get("/attendance/sessions/100")),
                new RequestSpec(post("/attendance/sessions/100/end"))
        );
    }

    private static Stream<org.junit.jupiter.params.provider.Arguments> invalidCreateRequests() {
        return Stream.of(
                org.junit.jupiter.params.provider.Arguments.of("""
                        {
                          "courseLabel": "Distributed Systems",
                          "roomLabel": "Room B12",
                          "gpsLat": "34.6814",
                          "gpsLon": "-1.9086",
                          "method": "QR_CODE"
                        }
                        """, "At least one groupId is required"),
                org.junit.jupiter.params.provider.Arguments.of("""
                        {
                          "groupIds": [1],
                          "courseLabel": "   ",
                          "roomLabel": "Room B12",
                          "gpsLat": "34.6814",
                          "gpsLon": "-1.9086",
                          "method": "QR_CODE"
                        }
                        """, "courseLabel is required"),
                org.junit.jupiter.params.provider.Arguments.of("""
                        {
                          "groupIds": [1],
                          "courseLabel": "Distributed Systems",
                          "roomLabel": "   ",
                          "gpsLat": "34.6814",
                          "gpsLon": "-1.9086",
                          "method": "QR_CODE"
                        }
                        """, "roomLabel is required")
        );
    }

    private static String validCreateRequestJson() {
        return """
                {
                  "groupIds": [1],
                  "courseLabel": "Distributed Systems",
                  "roomLabel": "Room B12",
                  "gpsLat": "34.6814",
                  "gpsLon": "-1.9086",
                  "method": "QR_CODE"
                }
                """;
    }

    private record RequestSpec(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder) {
    }
}
