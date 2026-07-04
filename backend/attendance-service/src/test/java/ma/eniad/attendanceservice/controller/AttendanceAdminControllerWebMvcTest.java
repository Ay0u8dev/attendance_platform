package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.config.RoleCheckInterceptor;
import ma.eniad.attendanceservice.config.WebConfig;
import ma.eniad.attendanceservice.dto.AdminOverviewResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionSummaryResponse;
import ma.eniad.attendanceservice.dto.PagedResponse;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;
import ma.eniad.attendanceservice.exception.GlobalExceptionHandler;
import ma.eniad.attendanceservice.service.AttendanceQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static ma.eniad.attendanceservice.controller.TestRequestHeaders.adminUser;
import static ma.eniad.attendanceservice.controller.TestRequestHeaders.teacherUser;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AttendanceAdminController.class)
@Import({WebConfig.class, RoleCheckInterceptor.class, GlobalExceptionHandler.class})
class AttendanceAdminControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceQueryService attendanceQueryService;

    @Test
    void adminOverviewSucceedsForAdmin() throws Exception {
        when(attendanceQueryService.getAdminOverview(any(), any()))
                .thenReturn(new AdminOverviewResponse(10, 1, 9, 90, 10, 0.9));

        mockMvc.perform(get("/attendance/admin/overview").with(adminUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").value(10))
                .andExpect(jsonPath("$.methodBreakdown").doesNotExist());
    }

    @Test
    void adminOverviewRejectsNonAdmin() throws Exception {
        mockMvc.perform(get("/attendance/admin/overview").with(teacherUser()))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminSessionsListSucceeds() throws Exception {
        when(attendanceQueryService.getAdminSessions(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PagedResponse<>(
                        List.of(new AttendanceSessionSummaryResponse(
                                100L, "Ayoub Elebbar", "Distributed Systems", "Room B12", List.of(1L),
                                AttendanceSessionStatus.FINALIZED, LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                                LocalDateTime.of(2026, 4, 28, 12, 30), 10, 1, 0
                        )),
                        0, 20, 1, 1
                ));

        mockMvc.perform(get("/attendance/admin/sessions").with(adminUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sessionId").value(100))
                .andExpect(jsonPath("$.items[0].teacherFullName").value("Ayoub Elebbar"))
                .andExpect(jsonPath("$.items[0].presentCount").value(10));
    }
}
