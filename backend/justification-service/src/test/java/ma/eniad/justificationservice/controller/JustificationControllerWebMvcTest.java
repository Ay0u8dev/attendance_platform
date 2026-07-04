package ma.eniad.justificationservice.controller;

import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;
import ma.eniad.justificationservice.service.CloudflareR2Service;
import ma.eniad.justificationservice.service.JustificationService;
import ma.eniad.justificationservice.service.RequestUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JustificationController.class)
class JustificationControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JustificationService service;

    @MockitoBean
    private CloudflareR2Service r2Service;

    @Test
    void adminEndpointUsesTrustedForwardAuthHeaders() throws Exception {
        when(service.findForAdmin(any(RequestUser.class), eq(JustificationStatus.PENDING)))
                .thenReturn(List.of(response(JustificationStatus.PENDING)));

        mockMvc.perform(get("/justifications/admin")
                        .param("status", "PENDING")
                        .header("X-User-Id", "5")
                        .header("X-User-Roles", "ADMIN")
                        .header("X-User-Email", "admin@ump.ac.ma"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void teacherDecisionDoesNotAcceptReviewerIdentityInPayload() throws Exception {
        when(service.decide(eq(1L), any(RequestUser.class), any()))
                .thenReturn(response(JustificationStatus.APPROVED));

        mockMvc.perform(patch("/justifications/1/decision")
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "APPROVED",
                                  "comment": "Accepted"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void missingForwardAuthHeadersAreRejected() throws Exception {
        mockMvc.perform(get("/justifications/admin"))
                .andExpect(status().is4xxClientError());
    }

    private JustificationResponse response(JustificationStatus status) {
        LocalDateTime now = LocalDateTime.of(2026, 6, 20, 9, 0);
        return JustificationResponse.builder()
                .id(1L)
                .attendanceRecordId(501L)
                .sessionId(100L)
                .studentId(10L)
                .groupId(20L)
                .teacherId(77L)
                .teacherName("Prof. Idrissi")
                .studentName("Aya Bennani")
                .studentEmail("aya@ump.ac.ma")
                .studentCode("A001")
                .courseLabel("Distributed Systems")
                .module("Distributed Systems")
                .roomLabel("B12")
                .absenceStartedAt(now)
                .sessionDate(now)
                .absenceEndedAt(now.plusMinutes(90))
                .reason("Medical appointment")
                .status(status)
                .createdAt(now)
                .submittedAt(now)
                .updatedAt(now)
                .build();
    }
}
