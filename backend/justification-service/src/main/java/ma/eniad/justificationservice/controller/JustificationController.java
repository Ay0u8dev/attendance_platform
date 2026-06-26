package ma.eniad.justificationservice.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;
import ma.eniad.justificationservice.service.JustificationService;

@RestController
@RequestMapping("/justifications")
public class JustificationController {

    private final JustificationService service;

    public JustificationController(JustificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Justification> findAll(@RequestParam(required = false) JustificationStatus status,
                                       @RequestParam(required = false) Long studentId) {
        return service.findAll(status, studentId);
    }

    @GetMapping("/{id}")
    public Justification findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public Justification submit(@Valid @RequestBody SubmitJustificationRequest request) {
        return service.submit(request);
    }

    @PatchMapping("/pending")
    public List<Justification> markAllAsPending() {
        return service.markAllAsPending();
    }

    @PatchMapping("/{id}/approve")
    public Justification approve(@PathVariable Long id,
                                 @Valid @RequestBody ReviewJustificationRequest request) {
        return service.approve(id, request);
    }

    @PatchMapping("/{id}/decline")
    public Justification decline(@PathVariable Long id,
                                 @Valid @RequestBody ReviewJustificationRequest request) {
        return service.decline(id, request);
    }
}
