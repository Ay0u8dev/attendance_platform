package ma.eniad.userservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.AuthUserRequest;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.dto.student.StudentRosterDto;
import ma.eniad.userservice.dto.teacher.InternalTeacherIdentityDto;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentInscriptionRepository inscriptionRepository;
    private final AnneeUniversitaireRepository anneeUniversitaireRepository;

    public UserResponseDto findUser(AuthUserRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean changed = false;
        boolean isStudent = hasRole(user, Role.STUDENT);
        boolean isTeacher = hasRole(user, Role.TEACHER);

        String requestedPfpUrl = normalizeProfilePhotoUrl(request.getPfpUrl());
        if (
                requestedPfpUrl != null
                        && user.isFirstLogin()
                        && (isStudent || isTeacher)
                        && normalizeProfilePhotoUrl(user.getPfpUrl()) == null
        ) {
            user.setPfpUrl(requestedPfpUrl);
            changed = true;
        }

        if (user.isFirstLogin() && !isStudent) {
            user.setFirstLogin(false);
            changed = true;
        }

        if (changed) {
            user = userRepository.save(user);
        }

        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pfpUrl(user.getPfpUrl())
                .roles(user.getRoles().stream().map(Enum::name).toList())
                .enabled(user.isEnabled())
                .firstLogin(user.isFirstLogin())
                .build();
    }


    public UserResponseDto findById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        return UserResponseDto.builder()
            .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pfpUrl(user.getPfpUrl())
                .roles(user.getRoles().stream().map(Enum::name).toList())
                .enabled(user.isEnabled())
                .firstLogin(user.isFirstLogin())
                .build();
    }

    public List<StudentRosterDto> getStudentRosterByGroupIds(List<Long> groupIds) {
        List<AnneeUniversitaire> activeYears = anneeUniversitaireRepository.findByActiveTrue();

        if (activeYears.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No active academic year found");
        }

        if (activeYears.size() > 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Multiple active academic years found");
        }

        Long activeYearId = activeYears.get(0).getId();
        List<Inscription> inscriptions =
                inscriptionRepository.findRosterByGroupIdsAndAnneeUniversitaireId(groupIds, activeYearId);

        return inscriptions.stream()
                .filter(inscription -> inscription.getStudent() != null)
                .map(inscription -> new StudentRosterDto(
                        inscription.getStudent().getId(),
                        inscription.getGroupe() != null ? inscription.getGroupe().getId() : null,
                        inscription.getStudent().getFirstName(),
                        inscription.getStudent().getLastName(),
                        inscription.getStudent().getEmail(),
                        inscription.getStudent().getPfpUrl(),
                        inscription.getStudent().getNumApogee(),
                        resolveFiliereCode(inscription),
                        resolveGroupeName(inscription)
                ))
                .toList();
    }

    public InternalTeacherIdentityDto getTeacherIdentityById(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher not found"));

        return new InternalTeacherIdentityDto(
                teacher.getId(),
                teacher.getFirstName(),
                teacher.getLastName()
        );
    }

    public List<Long> getEnabledAdminIds() {
        return userRepository.findEnabledUserIdsByRole(Role.ADMIN);
    }

    private String normalizeProfilePhotoUrl(String pfpUrl) {
        if (pfpUrl == null) {
            return null;
        }

        String trimmed = pfpUrl.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean hasRole(User user, Role role) {
        return user.getRoles() != null && user.getRoles().contains(role);
    }

    private String resolveFiliereCode(Inscription inscription) {
        Formation formation = inscription.getFormation();
        if (formation == null && inscription.getGroupe() != null) {
            formation = inscription.getGroupe().getFormation();
        }

        Filiere filiere = formation != null ? formation.getFiliere() : null;
        return filiere != null ? filiere.getCode() : null;
    }

    private String resolveGroupeName(Inscription inscription) {
        Groupe groupe = inscription.getGroupe();
        return groupe != null ? groupe.getName() : null;
    }
}
