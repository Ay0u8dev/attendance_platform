package ma.eniad.justificationservice.controller;

import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.entity.JustificationStatus;
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
        return new JustificationResponse(
                1L,
                501L,
                100L,
                10L,
                20L,
                77L,
                "Prof. Idrissi",
                "Aya Bennani",
                "aya@ump.ac.ma",
                "A001",
                "Distributed Systems",
                "B12",
                now,
                now.plusMinutes(90),
                "Medical appointment",
                null,
                status,
                null,
                null,
                null,
                null,
                now,
                now
        );
    }
}
