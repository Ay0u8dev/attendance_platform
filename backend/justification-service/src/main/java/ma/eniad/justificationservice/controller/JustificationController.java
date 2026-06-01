package ma.eniad.justificationservice.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.repository.JustificationRepository;

@RestController
@RequestMapping("/justifications")
public class JustificationController {

    private final JustificationRepository repository;

    public JustificationController(JustificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Justification> findAll() {
        return repository.findAll();
    }
}
