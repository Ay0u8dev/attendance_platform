package ma.eniad.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.eniad.userservice.entity.enums.Role;

@Entity
@Getter
@Setter
@ToString
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

    private String firstName;
    private String lastName;

    private String pictureUrl;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Builder.Default
    private boolean enabled = true;
}

