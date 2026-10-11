package co.edu.javeriana.nexo.support;

/** Error controlado que se devuelve al cliente con un código HTTP y un mensaje en español. */
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
