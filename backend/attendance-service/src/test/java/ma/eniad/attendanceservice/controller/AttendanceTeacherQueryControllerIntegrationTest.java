package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.AttendanceSessionSummaryResponse;
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
class AttendanceTeacherQueryControllerIntegrationTest {

    @org.springframework.beans.factory.annotation.Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceQueryService attendanceQueryService;

    @Test
    void teacherHistoryAndActiveSessionSucceed() throws Exception {
        when(attendanceQueryService.getTeacherSessions(anyLong(), any(), any(), any(), any()))
                .thenReturn(new PagedResponse<>(
                        List.of(new AttendanceSessionSummaryResponse(
                                100L, "Distributed Systems", "Room B12", List.of(1L),
                                AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.ACTIVE,
                                LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30),
                                null, 1, 0, 1
                        )),
                        0, 20, 1, 1
                ));
        when(attendanceQueryService.getActiveTeacherSession(77L))
                .thenReturn(new AttendanceSessionDetailsResponse(
                        100L, 77L, List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                        LocalDateTime.of(2026, 4, 28, 12, 0), LocalDateTime.of(2026, 4, 28, 12, 30), null,
                        AttendanceSessionMethod.QR_CODE, AttendanceSessionStatus.ACTIVE, 1, 0, 1, List.of()
                ));

        mockMvc.perform(get("/attendance/sessions")
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].sessionId").value(100));

        mockMvc.perform(get("/attendance/sessions/active")
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(100))
                .andExpect(jsonPath("$.presentCount").value(1));
    }
}
