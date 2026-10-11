package co.edu.javeriana.nexo;

import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.logging.Logger;

/**
 * Servidor HTTP autónomo en Java 17 para el backend de Nexo.
 * Se ejecuta localmente en el puerto 8080 con: mvn compile exec:java
 */
public class NexoServer {

  private static final Logger LOG = Logger.getLogger(NexoServer.class.getName());
  private static final Gson GSON = new GsonBuilder().serializeNulls().setPrettyPrinting().create();

  public static void main(String[] args) throws IOException {
    int port = 8080;
    String portEnv = System.getenv("PORT");
    if (portEnv != null && !portEnv.isBlank()) {
      try { port = Integer.parseInt(portEnv); } catch (Exception ignored) {}
    }

    Firebase.init();

    HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
    NexoApi api = new NexoApi();

    server.createContext("/", new HttpHandler() {
      @Override
      public void handle(HttpExchange exchange) throws IOException {
        Headers headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
        headers.set("Access-Control-Max-Age", "3600");

        String method = exchange.getRequestMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
          exchange.sendResponseHeaders(204, -1);
          exchange.close();
          return;
        }

        URI uri = exchange.getRequestURI();
        String path = uri.getPath();
        Map<String, String> query = parseQueryParams(uri.getQuery());

        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");

        JsonObject body = new JsonObject();
        try (InputStream is = exchange.getRequestBody()) {
          byte[] bytes = is.readAllBytes();
          if (bytes.length > 0) {
            String raw = new String(bytes, StandardCharsets.UTF_8).trim();
            if (!raw.isEmpty() && raw.startsWith("{")) {
              body = JsonParser.parseString(raw).getAsJsonObject();
            }
          }
        } catch (Exception e) {}

        try {
          Object responseObj = api.despachar(method, path, body, authHeader, query);
          byte[] resBytes = GSON.toJson(responseObj).getBytes(StandardCharsets.UTF_8);
          headers.set("Content-Type", "application/json; charset=utf-8");
          exchange.sendResponseHeaders(200, resBytes.length);
          try (OutputStream os = exchange.getResponseBody()) {
            os.write(resBytes);
          }
        } catch (ApiException e) {
          byte[] errBytes = GSON.toJson(Map.of("error", e.getMessage())).getBytes(StandardCharsets.UTF_8);
          headers.set("Content-Type", "application/json; charset=utf-8");
          exchange.sendResponseHeaders(e.getStatus(), errBytes.length);
          try (OutputStream os = exchange.getResponseBody()) {
            os.write(errBytes);
          }
        } catch (Exception e) {
          byte[] errBytes = GSON.toJson(Map.of("error", "Error interno: " + e.getMessage())).getBytes(StandardCharsets.UTF_8);
          headers.set("Content-Type", "application/json; charset=utf-8");
          exchange.sendResponseHeaders(500, errBytes.length);
          try (OutputStream os = exchange.getResponseBody()) {
            os.write(errBytes);
          }
        } finally {
          exchange.close();
        }
      }
    });

    server.setExecutor(Executors.newCachedThreadPool());

    server.start();

    System.out.println("==================================================================");
    System.out.println("  🚀 NEXO BACKEND ACTIVO (Java 17 + Firebase)");
    System.out.println("  Dirección: http://localhost:" + port);
    System.out.println("  Endpoint Health: http://localhost:" + port + "/api/health");
    System.out.println("  Modo Firebase Cloud: " + (Firebase.isCloudActive() ? "ACTIVADO" : "LOCAL MOCK (Seguro)"));
    System.out.println("==================================================================");
  }

  private static Map<String, String> parseQueryParams(String query) {
    Map<String, String> map = new LinkedHashMap<>();
    if (query == null || query.isBlank()) return map;
    for (String param : query.split("&")) {
      String[] pair = param.split("=");
      if (pair.length > 1) {
        map.put(pair[0], pair[1]);
      } else {
        map.put(pair[0], "");
      }
    }
    return map;
  }
}
