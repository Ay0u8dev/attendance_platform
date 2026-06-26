package ma.eniad.userservice.service.student;

public final class FaceEmbeddingMetadata {
    public static final int DIMENSION = 128;
    public static final int BYTE_LENGTH = DIMENSION * Float.BYTES;
    public static final int MAX_BASE64_LENGTH = 1024;
    public static final String MODEL = "opencv_sface_2021dec";
    public static final String FORMAT = "float32_little_endian_v1";

    private FaceEmbeddingMetadata() {
    }
}
