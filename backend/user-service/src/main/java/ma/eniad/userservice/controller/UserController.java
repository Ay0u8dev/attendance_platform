package ma.eniad.userservice.controller;

import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.AuthUserRequest;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("auth-user")
    public ResponseEntity<User> authUser(@RequestBody AuthUserRequest request) {

        String email = request.getEmail();
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        try {
            return ResponseEntity.ok(userService.findUser(request));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @RequireRole({"ADMIN"})
    @GetMapping("{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.findById(id));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

//    @GetMapping
//    public List<User> findAll() {
//        return userRepository.findAll();
//    }
//
//    @GetMapping("/{id}")
//    public User findById(Long id) {
//        return userRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
//    }
//
//    @PostMapping
//    public User save(@RequestBody User user) {
//        return userRepository.save(user);
//    }

//    @PutMapping("/{id}")
//    public User update(@PathVariable Long id, @RequestBody User user) {
//        User existingUser = userRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
//
//        existingUser.setUsername(user.getUsername());
//        existingUser.setFirstName(user.getFirstName());
//        existingUser.setLastName(user.getLastName());
//        existingUser.setPictureUrl(user.getPictureUrl());
//
//        return userRepository.save(existingUser);
//    }

}
