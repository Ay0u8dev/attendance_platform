package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.dto.AdminOverviewResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.dto.MethodBreakdownResponse;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
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
class AttendanceAdminControllerIntegrationTest {

    @org.springframework.beans.factory.annotation.Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceQueryService attendanceQueryService;

    @Test
    void adminOverviewSucceedsForAdmin() throws Exception {
        when(attendanceQueryService.getAdminOverview(any(), any()))
                .thenReturn(new AdminOverviewResponse(10, 1, 9, 90, 10, 0.9, new MethodBreakdownResponse(4, 3, 3)));

        mockMvc.perform(get("/attendance/admin/overview")
                        .header("X-User-Id", "1")
                        .header("X-User-Roles", "ADMIN")
                        .header("X-User-Email", "admin@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").value(10))
                .andExpect(jsonPath("$.methodBreakdown.qrCodeSessions").value(4));
    }

    @Test
    void adminOverviewRejectsNonAdmin() throws Exception {
        mockMvc.perform(get("/attendance/admin/overview")
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminSessionsListSucceeds() throws Exception {
        when(attendanceQueryService.getAdminSessions(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new PagedResponse<>(
                        List.of(new AttendanceSessionSummaryResponse(
                                100L, "Distributed Systems", "Room B12", List.of(1L),
                                AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.FINALIZED,
                                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                                LocalDateTime.of(2026, 4, 28, 12, 30), 10, 1, 0
                        )),
                        0, 20, 1, 1
                ));

        mockMvc.perform(get("/attendance/admin/sessions")
                        .header("X-User-Id", "1")
                        .header("X-User-Roles", "ADMIN")
                        .header("X-User-Email", "admin@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sessionId").value(100))
                .andExpect(jsonPath("$.items[0].presentCount").value(10));
    }
}
