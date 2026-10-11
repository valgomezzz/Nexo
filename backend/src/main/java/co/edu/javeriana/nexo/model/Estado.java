package co.edu.javeriana.nexo.model;

import co.edu.javeriana.nexo.support.ApiException;

/** Estados de un reporte (HU-03). */
public enum Estado {
  PENDIENTE("pend", "Pendiente"),
  EN_REVISION("rev", "En revisión"),
  ATENDIDO("ok", "Atendido");

  private final String codigo;
  private final String etiqueta;

  Estado(String codigo, String etiqueta) {
    this.codigo = codigo;
    this.etiqueta = etiqueta;
  }

  public String codigo() {
    return codigo;
  }

  public String etiqueta() {
    return etiqueta;
  }

  public static Estado desdeCodigo(String codigo) {
    for (Estado e : values()) {
      if (e.codigo.equals(codigo) || e.name().equals(codigo)) return e;
    }
    throw new ApiException(400, "Estado inválido. Usa: pend, rev u ok");
  }
}
