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
import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import java.io.BufferedWriter;
import java.io.IOException;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Punto de entrada de la Cloud Function "api" de Nexo.
 *
 * <pre>
 * GET    /me                  perfil del usuario autenticado
 * GET    /subjects            asignaturas inscritas / a cargo / todas
 * GET    /reports             reportes visibles según el rol
 * POST   /reports             crear reporte (estudiante)
 * PATCH  /reports/{id}        cambiar estado (docente)
 * GET    /stats?subjectId=&asignatura=&categoria=   métricas (docente / dirección)
 * </pre>
 * Todas las rutas exigen el encabezado "Authorization: Bearer &lt;idToken de Firebase&gt;".
 */
public class NexoApi implements HttpFunction {

  private static final Logger LOG = Logger.getLogger(NexoApi.class.getName());
  private static final Gson GSON = new GsonBuilder().serializeNulls().create();
  private static final String ORIGEN = System.getenv().getOrDefault("CORS_ORIGIN", "*");

  private final AuthService auth = new AuthService();
  private final SubjectService subjects = new SubjectService();
  private final ReportService reports = new ReportService(subjects);
  private final StatsService stats = new StatsService(reports, subjects);

  @Override
  public void service(HttpRequest req, HttpResponse res) throws IOException {
    res.appendHeader("Access-Control-Allow-Origin", ORIGEN);
    res.appendHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.appendHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.appendHeader("Access-Control-Max-Age", "3600");
    if ("OPTIONS".equals(req.getMethod())) {
      res.setStatusCode(204);
      return;
    }

    try {
      Usuario u = auth.autenticar(req.getFirstHeader("Authorization").orElse(null));
      enviar(res, 200, rutear(req, u));
    } catch (ApiException e) {
      enviar(res, e.getStatus(), Map.of("error", e.getMessage()));
    } catch (Exception e) {
      LOG.log(Level.SEVERE, "Error inesperado", e);
      enviar(res, 500, Map.of("error", "Ocurrió un error inesperado. Intenta de nuevo"));
    }
  }

  private Object rutear(HttpRequest req, Usuario u) throws IOException {
    // Con Firebase Hosting la ruta llega como /api/...; se quita el prefijo
    String path = req.getPath().replaceFirst("^/api", "").replaceAll("/+$", "");
    String[] p = path.isEmpty() ? new String[0] : path.substring(1).split("/");
    String m = req.getMethod();
    boolean verEstudiante = u.rol() == Rol.ESTUDIANTE || u.rol() == Rol.ADMIN;

    if (p.length == 1 && p[0].equals("me") && m.equals("GET")) {
      return u.toJson();
    }
    if (p.length == 1 && p[0].equals("subjects") && m.equals("GET")) {
      return subjects.visibles(u).stream().map(Asignatura::toJson).toList();
    }
    if (p.length == 1 && p[0].equals("reports")) {
      if (m.equals("GET")) return reports.visibles(u).stream().map(r -> r.toJson(verEstudiante)).toList();
      if (m.equals("POST")) return reports.crear(u, cuerpo(req)).toJson(true);
    }
    if (p.length == 2 && p[0].equals("reports") && m.equals("PATCH")) {
      Reporte r = reports.cambiarEstado(u, p[1], cuerpo(req));
      return r.toJson(verEstudiante);
    }
    if (p.length == 1 && p[0].equals("stats") && m.equals("GET")) {
      return stats.resumen(u,
          req.getFirstQueryParameter("subjectId").orElse(null),
          req.getFirstQueryParameter("asignatura").orElse(null),
          req.getFirstQueryParameter("categoria").orElse(null));
    }
    throw new ApiException(404, "Ruta no encontrada: " + m + " " + path);
  }

  private static JsonObject cuerpo(HttpRequest req) throws IOException {
    try {
      var el = JsonParser.parseReader(req.getReader());
      if (!el.isJsonObject()) throw new ApiException(400, "El cuerpo debe ser un objeto JSON");
      return el.getAsJsonObject();
    } catch (JsonParseException e) {
      throw new ApiException(400, "JSON inválido");
    }
  }

  private static void enviar(HttpResponse res, int status, Object body) throws IOException {
    res.setStatusCode(status);
    res.setContentType("application/json; charset=utf-8");
    BufferedWriter w = res.getWriter();
    w.write(GSON.toJson(body));
  }
}
