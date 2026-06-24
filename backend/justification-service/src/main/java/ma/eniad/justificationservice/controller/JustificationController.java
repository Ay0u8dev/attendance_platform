package ma.eniad.justificationservice.controller;

import jakarta.validation.Valid;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.JustificationStatus;
import ma.eniad.justificationservice.service.JustificationService;
import ma.eniad.justificationservice.service.RequestUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/justifications")
public class JustificationController {

    private final JustificationService service;

    public JustificationController(JustificationService service) {
        this.service = service;
    }

    @GetMapping("/admin")
    public List<JustificationResponse> findForAdmin(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForAdmin(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/teacher")
    public List<JustificationResponse> findForTeacher(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForTeacher(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/student")
    public List<JustificationResponse> findForStudent(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForStudent(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/{id}")
    public JustificationResponse findById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findById(id, RequestUser.fromHeaders(userId, roles, email));
    }

    @PostMapping("/student")
    public JustificationResponse submit(
            @Valid @RequestBody SubmitJustificationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.submit(RequestUser.fromHeaders(userId, roles, email), request);
    }

    @PatchMapping("/{id}/decision")
    public JustificationResponse decide(
            @PathVariable Long id,
            @Valid @RequestBody DecisionJustificationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.decide(id, RequestUser.fromHeaders(userId, roles, email), request);
    }
}
