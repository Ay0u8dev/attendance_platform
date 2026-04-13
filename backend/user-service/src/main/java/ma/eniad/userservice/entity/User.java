package ma.eniad.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.eniad.userservice.entity.enums.Role;

import java.util.List;

@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;
    private String username;

    @Enumerated(EnumType.STRING)
    @ElementCollection(fetch = FetchType.EAGER, targetClass = Role.class)
    private List<Role> roles;

    @Builder.Default
    private boolean enabled = true;

    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserDetails userDetails;
}

