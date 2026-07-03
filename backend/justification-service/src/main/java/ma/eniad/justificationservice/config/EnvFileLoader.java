package ma.eniad.justificationservice.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public final class EnvFileLoader {

    private static final List<Path> CANDIDATE_FILES = List.of(
            Path.of(".env"),
            Path.of("backend/justification-service/.env")
    );

    private EnvFileLoader() {
    }

    public static void loadIfPresent() {
        for (Path candidate : CANDIDATE_FILES) {
            if (loadFrom(candidate)) {
                return;
            }
        }
    }

    private static boolean loadFrom(Path envFile) {
        if (!Files.isRegularFile(envFile)) {
            return false;
        }

        try {
            for (String line : Files.readAllLines(envFile)) {
                applyLine(line);
            }
            return true;
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load environment file: " + envFile.toAbsolutePath(), ex);
        }
    }

    private static void applyLine(String line) {
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith("#")) {
            return;
        }

        int separatorIndex = trimmed.indexOf('=');
        if (separatorIndex <= 0) {
            return;
        }

        String key = trimmed.substring(0, separatorIndex).trim();
        String value = unquote(trimmed.substring(separatorIndex + 1).trim());
        if (key.isEmpty() || value.isBlank()) {
            return;
        }

        if (System.getenv(key) == null && System.getProperty(key) == null) {
            System.setProperty(key, value);
        }
    }

    private static String unquote(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}
