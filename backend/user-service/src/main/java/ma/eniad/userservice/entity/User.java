package ma.eniad.userservice.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import ma.eniad.userservice.entity.enums.Role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.Set;

@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Table(
    name = "users",
    indexes = {
        @Index(name = "idx_users_email", columnList = "email")
    }
)
public class User extends BaseEntity {
    @NotBlank
    @Size(max = 254)
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Size(max = 100)
    @Column(length = 100)
    private String firstName;

    @Size(max = 100)
    @Column(length = 100)
    private String lastName;

    @Size(max = 512)
    @Column(length = 512)
    private String pfpUrl;

    @Enumerated(EnumType.STRING)
    @ElementCollection(fetch = FetchType.EAGER, targetClass = Role.class)
    @CollectionTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        uniqueConstraints = @UniqueConstraint(
            name = "uk_user_roles_user_role",
            columnNames = {"user_id", "role"}
        ),
        indexes = @Index(name = "idx_user_roles_user_id", columnList = "user_id")
    )
    @Column(name = "role", nullable = false, length = 30)
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean firstLogin = true;
}

