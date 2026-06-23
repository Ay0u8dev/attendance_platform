package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.config.RoleCheckInterceptor;
import ma.eniad.attendanceservice.config.WebConfig;
import ma.eniad.attendanceservice.dto.AdminJustificationResponse;
import ma.eniad.attendanceservice.entity.JustificationStatus;
import ma.eniad.attendanceservice.exception.GlobalExceptionHandler;
import ma.eniad.attendanceservice.service.AdminJustificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static ma.eniad.attendanceservice.controller.TestRequestHeaders.adminUser;
import static ma.eniad.attendanceservice.controller.TestRequestHeaders.teacherUser;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminJustificationController.class)
@Import({WebConfig.class, RoleCheckInterceptor.class, GlobalExceptionHandler.class})
class AdminJustificationControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminJustificationService adminJustificationService;

    @Test
    void listJustificationsSucceedsForAdmin() throws Exception {
        when(adminJustificationService.getJustifications(null))
                .thenReturn(List.of(response(1L, JustificationStatus.PENDING)));

        mockMvc.perform(get("/attendance/admin/justifications").with(adminUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].studentFirstName").value("Aya"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void listJustificationsRejectsNonAdmin() throws Exception {
        mockMvc.perform(get("/attendance/admin/justifications").with(teacherUser()))
                .andExpect(status().isForbidden());
    }

    @Test
    void reviewJustificationUpdatesStatus() throws Exception {
        when(adminJustificationService.reviewJustification(eq(1L), eq(1L), any()))
                .thenReturn(response(1L, JustificationStatus.APPROVED));

        mockMvc.perform(patch("/attendance/admin/justifications/1/review")
                        .with(adminUser())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "APPROVED",
                                  "adminComment": "Document verified"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    private AdminJustificationResponse response(Long id, JustificationStatus status) {
        return new AdminJustificationResponse(
                id,
                10L,
                12L,
                1L,
                "Aya",
                "Bennani",
                "aya@ump.ac.ma",
                "240001",
                "Distributed Systems",
                "Room B12",
                "Ayoub Elebbar",
                LocalDateTime.of(2026, 4, 28, 12, 0),
                LocalDateTime.of(2026, 4, 28, 12, 30),
                "Certificat medical depose.",
                "certificat.pdf",
                status,
                null,
                null,
                null,
                LocalDateTime.of(2026, 4, 29, 10, 0),
                LocalDateTime.of(2026, 4, 29, 10, 0)
        );
    }
}
