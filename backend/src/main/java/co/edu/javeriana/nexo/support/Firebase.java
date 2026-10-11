package co.edu.javeriana.nexo.support;

import com.google.api.core.ApiFuture;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.IOException;
import java.util.concurrent.ExecutionException;

/**
 * Inicializa Firebase Admin una sola vez.
 * En Cloud Functions usa las credenciales del entorno; en local usa la variable
 * GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON de la cuenta de servicio).
 */
public final class Firebase {
  private Firebase() {}

  public static synchronized void init() {
    if (!FirebaseApp.getApps().isEmpty()) return;
    try {
      FirebaseOptions.Builder b = FirebaseOptions.builder()
          .setCredentials(GoogleCredentials.getApplicationDefault());
      String projectId = System.getenv("GOOGLE_CLOUD_PROJECT");
      if (projectId != null && !projectId.isBlank()) b.setProjectId(projectId);
      FirebaseApp.initializeApp(b.build());
    } catch (IOException e) {
      throw new IllegalStateException("No se pudieron cargar las credenciales de Firebase", e);
    }
  }

  public static Firestore db() {
    init();
    return FirestoreClient.getFirestore();
  }

  /** Espera un resultado de Firestore convirtiendo los errores en ApiException. */
  public static <T> T await(ApiFuture<T> future) {
    try {
      return future.get();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ApiException(500, "La operación fue interrumpida");
    } catch (ExecutionException e) {
      Throwable c = e.getCause();
      while (c != null && !(c instanceof ApiException)) c = c.getCause();
      if (c != null) throw (ApiException) c;
      throw new ApiException(500, "Error de base de datos: " + e.getCause().getMessage());
    }
  }
}
