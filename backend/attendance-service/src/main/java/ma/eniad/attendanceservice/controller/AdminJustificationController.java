package ma.eniad.attendanceservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.dto.AdminJustificationResponse;
import ma.eniad.attendanceservice.dto.AdminJustificationReviewRequest;
import ma.eniad.attendanceservice.entity.JustificationStatus;
import ma.eniad.attendanceservice.service.AdminJustificationService;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/attendance/admin/justifications")
@RequiredArgsConstructor
public class AdminJustificationController {

    private final AdminJustificationService adminJustificationService;

    @RequireRole({"ADMIN"})
    @GetMapping
    public List<AdminJustificationResponse> getJustifications(
            @RequestParam(name = "status", required = false) JustificationStatus status
    ) {
        return adminJustificationService.getJustifications(status);
    }

    @RequireRole({"ADMIN"})
    @GetMapping("/{id}")
    public AdminJustificationResponse getJustification(@PathVariable Long id) {
        return adminJustificationService.getJustification(id);
    }

    @RequireRole({"ADMIN"})
    @PatchMapping("/{id}/review")
    public AdminJustificationResponse reviewJustification(@PathVariable Long id,
                                                          @Valid @RequestBody AdminJustificationReviewRequest request) {
        Long reviewerId = Long.valueOf(UserContext.getCurrentUser().userId());
        return adminJustificationService.reviewJustification(id, reviewerId, request);
    }
}
