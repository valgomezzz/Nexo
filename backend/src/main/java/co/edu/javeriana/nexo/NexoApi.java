package co.edu.javeriana.nexo;

import co.edu.javeriana.nexo.model.Asignatura;
import co.edu.javeriana.nexo.model.Reporte;
import co.edu.javeriana.nexo.model.Rol;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.service.AuthService;
import co.edu.javeriana.nexo.service.ReportService;
import co.edu.javeriana.nexo.service.StatsService;
import co.edu.javeriana.nexo.service.SubjectService;
import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.BufferedWriter;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Núcleo de la API REST de Nexo en Java.
 * Funciona tanto en Cloud Functions como en servidor local autónomo.
 */
public class NexoApi implements HttpFunction {

  private static final Logger LOG = Logger.getLogger(NexoApi.class.getName());
  private static final Gson GSON = new GsonBuilder().serializeNulls().setPrettyPrinting().create();

  private final AuthService auth = new AuthService();
  private final SubjectService subjects = new SubjectService();
  private final ReportService reports = new ReportService(subjects);
  private final StatsService stats = new StatsService(reports, subjects);

  @Override
  public void service(HttpRequest req, HttpResponse res) throws IOException {
    res.appendHeader("Access-Control-Allow-Origin", "*");
    res.appendHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.appendHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
      res.setStatusCode(204);
      return;
    }

    try {
      String authHeader = req.getFirstHeader("Authorization").orElse(null);
      String bodyRaw = new String(req.getInputStream().readAllBytes());
      JsonObject body = bodyRaw.isBlank() ? new JsonObject() : JsonParser.parseString(bodyRaw).getAsJsonObject();
      String path = req.getPath();
      String method = req.getMethod();
      Map<String, String> query = new LinkedHashMap<>();
      req.getQueryParameters().forEach((k, v) -> query.put(k, v.isEmpty() ? null : v.get(0)));

      Object resultado = despachar(method, path, body, authHeader, query);
      enviar(res, 200, resultado);
    } catch (ApiException e) {
      enviar(res, e.getStatus(), Map.of("error", e.getMessage()));
    } catch (Exception e) {
      LOG.log(Level.SEVERE, "Error inesperado", e);
      enviar(res, 500, Map.of("error", "Error interno del servidor Java: " + e.getMessage()));
    }
  }

  public Object despachar(String method, String fullPath, JsonObject body, String authHeader, Map<String, String> query) {
    String path = fullPath.replaceFirst("^/api", "").replaceAll("/+$", "");
    if (path.isEmpty()) path = "/";

    // 1. Health check público
    if (path.equals("/health") || path.equals("/")) {
      return Map.of(
          "status", "ok",
          "service", "Nexo Backend (Java 17)",
          "firebaseCloud", Firebase.isCloudActive(),
          "timestamp", System.currentTimeMillis()
      );
    }

    // 2. Login directo
    if (path.equals("/auth/login") && "POST".equalsIgnoreCase(method)) {
      String email = body.has("email") ? body.get("email").getAsString() : "";
      String pass = body.has("password") ? body.get("password").getAsString() : "";
      String role = body.has("role") ? body.get("role").getAsString() : "est";
      Usuario u = auth.loginDirecto(email, pass, role);
      Map<String, Object> resp = new LinkedHashMap<>(u.toJson());
      resp.put("token", u.uid()); // Token de sesión
      return resp;
    }

    // Rutas protegidas
    Usuario u = auth.autenticar(authHeader);
    boolean verEstudiante = u.rol() == Rol.ESTUDIANTE || u.rol() == Rol.ADMIN;

    // Perfil
    if (path.equals("/me") && "GET".equalsIgnoreCase(method)) {
      return u.toJson();
    }

    // Asignaturas
    if (path.equals("/subjects") && "GET".equalsIgnoreCase(method)) {
      return subjects.visibles(u).stream().map(Asignatura::toJson).toList();
    }

    // Reportes (Listar o Crear)
    if (path.equals("/reports")) {
      if ("GET".equalsIgnoreCase(method)) {
        return reports.visibles(u).stream().map(r -> r.toJson(verEstudiante)).toList();
      }
      if ("POST".equalsIgnoreCase(method)) {
        return reports.crear(u, body).toJson(true);
      }
    }

    // Actualizar estado de reporte
    if (path.startsWith("/reports/") && "PATCH".equalsIgnoreCase(method)) {
      String id = path.substring("/reports/".length());
      return reports.cambiarEstado(u, id, body).toJson(verEstudiante);
    }

    // Estadísticas
    if (path.equals("/stats") && "GET".equalsIgnoreCase(method)) {
      String subId = query != null ? query.get("subjectId") : null;
      String cat = query != null ? query.get("categoria") : null;
      return stats.resumen(u, subId, cat);
    }

    throw new ApiException(404, "Ruta no encontrada: " + method + " " + fullPath);
  }

  private static void enviar(HttpResponse res, int status, Object body) throws IOException {
    res.setStatusCode(status);
    res.setContentType("application/json; charset=utf-8");
    BufferedWriter w = res.getWriter();
    w.write(GSON.toJson(body));
  }
}
