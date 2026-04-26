package ma.eniad.authservice.services;


import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import ma.eniad.authservice.dto.Role;
import ma.eniad.authservice.dto.UserDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class JwtService {
    private static final String CLAIM_ID = "id";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLES = "roles";

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${app.jwt.issuer:auth-service}")
    private String jwtIssuer;

    public String generateToken(UserDto user) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put(CLAIM_ID, user.getId());
        extraClaims.put(CLAIM_EMAIL, user.getEmail());

        List<String> roles = new ArrayList<>();
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            roles = user.getRoles().stream()
                    .filter(Objects::nonNull)
                    .map(Enum::name)
                    .collect(Collectors.toList());
        }

        if (roles.isEmpty()) {
            roles.add(Role.STUDENT.name());
        }

        extraClaims.put(CLAIM_ROLES, roles);

        return generateToken(extraClaims, user.getEmail());
    }

    public String generateToken(Map<String, Object> extraClaims, String subject) {
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(subject)
                .setIssuer(jwtIssuer)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public List<String> extractRoles(Claims claims) {
        Object rawRoles = claims.get(CLAIM_ROLES);
        if (rawRoles instanceof List<?> list && !list.isEmpty()) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    public Claims parseAndValidateAccessToken(String token) {
        Claims claims = extractAllClaims(token);
        validateClaims(claims);
        return claims;
    }

    public String extractUserId(Claims claims) {
        Object userId = claims.get(CLAIM_ID);
        if (userId == null) {
            throw new JwtException("Missing user id");
        }

        String id = String.valueOf(userId).trim();
        if (id.isEmpty()) {
            throw new JwtException("Blank user id");
        }
        return id;
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private void validateClaims(Claims claims) {
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new JwtException("Missing subject");
        }

        String email = claims.get(CLAIM_EMAIL, String.class);
        if (email == null || email.isBlank()) {
            throw new JwtException("Missing email");
        }
        if (!subject.equals(email)) {
            throw new JwtException("Subject/email mismatch");
        }

        extractUserId(claims);

        List<String> roles = extractRoles(claims);
        if (roles.isEmpty()) {
            throw new JwtException("Missing roles");
        }

        String issuer = claims.getIssuer();
        if (issuer != null && !issuer.equals(jwtIssuer)) {
            throw new JwtException("Invalid token issuer");
        }
    }

}


