package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceOverviewResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceSessionDetailResponse;
import ma.eniad.attendanceservice.dto.StudentAttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.service.AttendanceQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttendanceStudentControllerIntegrationTest {

    @org.springframework.beans.factory.annotation.Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceQueryService attendanceQueryService;

    @Test
    void studentHistorySucceedsForStudent() throws Exception {
        when(attendanceQueryService.getStudentSessions(anyLong(), any(), any(), any(), any()))
                .thenReturn(new PagedResponse<>(
                        List.of(new StudentAttendanceSessionSummaryResponse(
                                100L, "Distributed Systems", "Room B12", List.of(1L),
                                AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.FINALIZED,
                                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                                AttendanceStudentStatus.PRESENT, AttendanceSessionMethod.QR_CODE, LocalDateTime.of(2026, 4, 28, 12, 5)
                        )),
                        0, 20, 1, 1
                ));

        mockMvc.perform(get("/attendance/student/sessions")
                        .header("X-User-Id", "12")
                        .header("X-User-Roles", "STUDENT")
                        .header("X-User-Email", "student@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].attendanceStatus").value("PRESENT"));
    }

    @Test
    void studentDetailAndOverviewUseStudentRole() throws Exception {
        when(attendanceQueryService.getStudentSession(12L, 100L))
                .thenReturn(new StudentAttendanceSessionDetailResponse(
                        100L, "Distributed Systems", "Room B12", List.of(1L),
                        AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.FINALIZED,
                        LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30), LocalDateTime.of(2026, 4, 28, 12, 30),
                        12L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "A001",
                        AttendanceStudentStatus.PRESENT, AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091",
                        LocalDateTime.of(2026, 4, 28, 12, 5)
                ));
        when(attendanceQueryService.getStudentOverview(12L))
                .thenReturn(new StudentAttendanceOverviewResponse(10, 9, 1, 0.9));

        mockMvc.perform(get("/attendance/student/sessions/100")
                        .header("X-User-Id", "12")
                        .header("X-User-Roles", "STUDENT")
                        .header("X-User-Email", "student@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(12))
                .andExpect(jsonPath("$.markedGpsLat").value("34.6820"));

        mockMvc.perform(get("/attendance/student/overview")
                        .header("X-User-Id", "12")
                        .header("X-User-Roles", "STUDENT")
                        .header("X-User-Email", "student@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceRate").value(0.9));
    }

    @Test
    void studentEndpointsRejectNonStudent() throws Exception {
        mockMvc.perform(get("/attendance/student/overview")
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma"))
                .andExpect(status().isForbidden());
    }
}
