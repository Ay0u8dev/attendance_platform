package ma.eniad.authservice.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api")
public class DemoController {

    @GetMapping("/hello")
    @Operation(
        summary = "Route protégée",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<String> sayHello() {
        return ResponseEntity.ok("Bienvenue ! Tu es bien authentifié ");
    }
} 
