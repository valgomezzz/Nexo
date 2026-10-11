package co.edu.javeriana.nexo.support;

/** Excepción controlada de la API con código HTTP y mensaje en español. */
public class ApiException extends RuntimeException {
  private final int status;

  public ApiException(int status, String message) {
    super(message);
    this.status = status;
  }

  public int getStatus() {
    return status;
  }
}
