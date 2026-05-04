package ma.eniad.userservice.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

// import lombok.NoArgsConstructor;

@Getter
@Setter
@Entity
//@RequiredArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Table(name = "teachers")
@PrimaryKeyJoinColumn(name = "user_id")
public class Teacher extends User {
}