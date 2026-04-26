package ma.eniad.userservice.repository;

import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnneeUniversitaireRepository extends JpaRepository<AnneeUniversitaire, Long> {
    List<AnneeUniversitaire> findByIsActiveTrue();
}
