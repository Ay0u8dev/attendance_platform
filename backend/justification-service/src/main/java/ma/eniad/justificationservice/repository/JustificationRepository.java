package ma.eniad.justificationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import ma.eniad.justificationservice.entity.Justification;

@Repository
public interface JustificationRepository extends JpaRepository<Justification, Long> {
}
