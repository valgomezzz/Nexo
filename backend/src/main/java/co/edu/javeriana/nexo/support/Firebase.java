package co.edu.javeriana.nexo.support;

import com.google.api.core.ApiFuture;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutionException;
import java.util.logging.Logger;

/**
 * Inicializador inteligente de Firebase Admin SDK.
 * - Si existe serviceAccountKey.json o GOOGLE_APPLICATION_CREDENTIALS, conecta a Cloud Firestore.
 * - Si no, opera en modo local con almacenamiento simulado para desarrollo inmediato.
 */
public final class Firebase {

  private static final Logger LOG = Logger.getLogger(Firebase.class.getName());
  private static boolean initialized = false;
  private static boolean cloudActive = false;

  private Firebase() {}

  public static synchronized void init() {
    if (initialized) return;
    initialized = true;

    // Buscar archivo serviceAccountKey.json en rutas estándar
    File[] posiblesArchivos = {
        new File("serviceAccountKey.json"),
        new File("backend/serviceAccountKey.json"),
        new File("../backend/serviceAccountKey.json")
    };

    File keyFile = null;
    for (File f : posiblesArchivos) {
      if (f.exists() && f.isFile()) {
        keyFile = f;
        break;
      }
    }

    try {
      GoogleCredentials credentials = null;
      if (keyFile != null) {
        LOG.info("[Firebase Admin] Cargando credenciales desde: " + keyFile.getAbsolutePath());
        try (InputStream is = new FileInputStream(keyFile)) {
          credentials = GoogleCredentials.fromStream(is);
        }
      } else if (System.getenv("GOOGLE_APPLICATION_CREDENTIALS") != null) {
        LOG.info("[Firebase Admin] Usando GOOGLE_APPLICATION_CREDENTIALS");
        credentials = GoogleCredentials.getApplicationDefault();
      }

      if (credentials != null) {
        FirebaseOptions.Builder b = FirebaseOptions.builder().setCredentials(credentials);
        String projectId = System.getenv("GOOGLE_CLOUD_PROJECT");
        if (projectId != null && !projectId.isBlank()) b.setProjectId(projectId);
        else b.setProjectId("nexo-7a24e");

        FirebaseApp.initializeApp(b.build());
        cloudActive = true;
        LOG.info("[Firebase Admin] Conexión establecida exitosamente con Firebase Cloud.");
      } else {
        LOG.info("[Firebase Admin] No se encontró clave privada. Operando en modo Local Mock (PUJ InMemory).");
        cloudActive = false;
      }
    } catch (Exception e) {
      LOG.warning("[Firebase Admin] No se pudo inicializar en la nube (" + e.getMessage() + "). Operando en modo Local Mock.");
      cloudActive = false;
    }
  }

  public static boolean isCloudActive() {
    init();
    return cloudActive;
  }

  public static Firestore db() {
    init();
    if (!cloudActive) return null;
    return FirestoreClient.getFirestore();
  }

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
      throw new ApiException(500, "Error de base de datos: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
    }
  }
}
