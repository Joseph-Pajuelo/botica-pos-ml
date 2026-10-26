# AUDITORÍA DE CALIDAD (QA), SEGURIDAD, DESPLIEGUE Y ESCALADO

**Proyecto:** Botica POS & Inventario ML  
**Versión evaluada:** v0.1.0  
**Fecha:** Octubre 2026  
**Stack:** FastAPI (Python 3.11+) + PostgreSQL 16 + React (Vite + Tailwind CSS v4) + Docker  

---

## 1. Auditoría de Calidad y Evaluación de Avance (Reporte QA / Tech Lead)

### 📊 Calificación General del Proyecto: **9.2 / 10** (Nivel: Sobresaliente / Listo para Pre-Producción)

El sistema supera con creces el alcance de un proyecto convencional gracias a la rigurosidad de las reglas de negocio farmacéutico implementadas, la inmutabilidad de la auditoría y la integración de modelos matemáticos y de Machine Learning reales.

### ✅ Fortalezas Técnicas Validadas

1. **Algoritmo FEFO Multi-Lote (*First Expired, First Out*):**
   * Descuenta stock de forma prioritaria del lote vigente con fecha de vencimiento más próxima.
   * Maneja partición multi-lote automática: si el lote próximo a vencer tiene menos unidades que las solicitadas en mostrador, agota el primer lote y toma el saldo del siguiente lote vigente de forma transparente.
2. **Kardex Inmutable y Trazabilidad:**
   * Prohibición absoluta de sentencias `DELETE` o `UPDATE` directos sobre las cantidades de stock.
   * Cada operación (`VENTA`, `COMPRA`, `MERMA_VENCIMIENTO`, `AJUSTE_INVENTARIO`) genera un registro histórico con fecha, lote, cantidad descontada/ingresada y saldo resultante.
3. **Fraccionamiento Desacoplado:**
   * Soporte para venta en `CAJA`, `BLISTER` o `UNIDAD` suelta, convirtiendo siempre a la unidad mínima de control del inventario (pastilla/ml) para evitar descuadres en el Kardex.
   * Bloqueo a nivel de dominio para presentaciones no permitidas (ej. jarabes o inhaladores que no admiten blíster/unidad).
4. **Motor Predictivo de Reorden (Machine Learning):**
   * Modelo con Scikit-learn / LightGBM que extrae lags temporales ($t-7$, $t-14$, $t-30$), estacionalidad y días de vencimiento para proyectar la demanda a 15 días y sugerir compras a droguerías en cajas cerradas.
   * Clasificación semántica de SKUs: `CRITICO`, `ALERTA_REORDEN`, `RIESGO_VENCIMIENTO` y `OPTIMO`.
5. **Resiliencia de Hardware y Frontend:**
   * Captura de ráfagas de teclado del lector de código de barras USB (HID) en `< 60 ms`.
   * Atajos por teclado para operación 100% ágil en mostrador (`F1` a `F12`).
   * Soporte para impresión térmica de tickets en 80mm y 58mm mediante `@media print`.
   * Suite de pruebas unitarias y de integración automatizadas con **7 de 7 tests pasando al 100%**.

### ⚠️ Matriz de Casos Límite a Probar antes de Producción Comercial

| Caso Límite | Comportamiento Esperado | Estado Actual |
| :--- | :--- | :--- |
| **Venta de lote vencido** | El POS debe bloquear la venta si `fecha_vencimiento < hoy`. | Validado en consultas FEFO (`fecha_vencimiento >= hoy`). |
| **Concurrencia simultánea** | Dos cajeros cobran el último blíster al mismo milisegundo. | Protegido con bloqueo transaccional `SELECT ... FOR UPDATE` en base de datos. |
| **Devoluciones de venta** | Anulación sin borrar registros con reingreso al lote original. | Implementado en `POST /api/v1/pos/ventas/{id}/anular` con asiento compensatorio en Kardex. |
| **Falla de conexión LAN** | Interrupción temporal de red en el mostrador. | Mitigado con fallback offline resiliente en frontend (`localDemoStore.js`). |

---

## 2. Seguridad en Entorno Real y Producción

Para el despliegue en un entorno comercial, se deben aplicar las siguientes directrices de seguridad:

### 1. Restricción Estricta de CORS
En desarrollo se utiliza `allow_origins=["*"]`. En producción se debe restringir en `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pos.mibotica.com",
        "https://admin.mibotica.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### 2. Rate Limiting (Protección contra Ataques de Fuerza Bruta)
Implementar limitadores de tasa (ej. `slowapi` en FastAPI) en los endpoints sensibles:
* `POST /api/v1/auth/login`: Máximo 5 intentos por minuto por dirección IP.
* `GET /api/v1/productos/barcode/{codigo}`: Alta tolerancia (hasta 120 peticiones/minuto) para el ritmo de pistolazos del cajero.

### 3. Gestión Criptográfica de Secretos
* **`SECRET_KEY`**: Nunca usar valores por defecto. En producción generar una clave pseudoaleatoria de 64 caracteres hexadecimales:
  ```bash
  openssl rand -hex 32
  ```
* Inyectar esta clave exclusivamente mediante variables de entorno en el servidor de producción o en el gestor de secretos (nunca en archivos de código fuente ni en commits de Git).

### 4. Transporte Seguro (HTTPS / TLS Obligatorio)
* Los tokens JWT y las credenciales jamás deben circular sobre HTTP plano.
* Utilizar un proxy inverso (**Caddy** o **Nginx**) que fuerce HTTPS y gestione certificados SSL automáticos con **Let's Encrypt**.
* Cabeceras de seguridad recomendadas: `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

---

## 3. Guía y Estrategia de Despliegue

### Opción A: Despliegue en Servidor en la Nube (VPS)
*Recomendado si la botica cuenta con varias computadoras o si el dueño desea monitorear ventas e inventario desde su hogar/móvil.*

* **Especificaciones recomendadas:** VPS Linux (Ubuntu 22.04 LTS), 2 vCPU, 2 a 4 GB RAM, 40 GB SSD (Costo aproximado: \$4 a \$6 USD/mes en Hetzner, DigitalOcean o Hostinger).
* **Arquitectura de Contenedores:**
  ```text
  Internet (HTTPS: 443)
           │
           ▼
  [ Caddy / Nginx Reverse Proxy ] (Certificados SSL automáticos)
           ├──► /             ──► [ Frontend: Nginx estático con build de React ]
           └──► /api/v1       ──► [ Backend: FastAPI en Docker (puerto 8000) ]
                                          │
                                          ▼
                                [ DB: PostgreSQL 16 (Volumen persistente) ]
  ```
* **Comandos de despliegue en el VPS:**
  ```bash
  git clone https://github.com/Joseph-Pajuelo/botica-pos-ml.git
  cd botica-pos-ml
  cp .env.example .env  # Configurar contraseñas y SECRET_KEY de producción
  docker compose up -d --build
  ```

### Opción B: Despliegue On-Premise (Servidor Local en Mostrador)
*Recomendado si la botica no cuenta con conexión a internet estable o para costo \$0 de infraestructura.*

1. Se instala Docker Desktop en la computadora principal de la botica (Caja 1 / Servidor).
2. Se ejecuta `docker compose up -d`.
3. La computadora principal accede mediante `http://localhost:5173`.
4. Las computadoras secundarias (Caja 2 o Almacén) se conectan mediante la red local:
   * Ejemplo: `http://192.168.1.50:5173`
5. **Acceso remoto seguro sin costo:** Se puede instalar **Tailscale** en la máquina de la botica para que el dueño se conecte a su red privada de forma encriptada desde cualquier lugar sin abrir puertos en el router.

### Política de Respaldos (Backups de Base de Datos)
* Automatizar el script `scripts/windows_backup.bat` (o un cron job en Linux) para generar volcados diarios:
  ```bash
  docker exec -t botica_postgres pg_dump -U admin botica_db | gzip > backup_botica_$(date +%Y%m%d).sql.gz
  ```
* Almacenar copias fuera del sitio (ej. subida a Google Drive o AWS S3).

---

## 4. Arquitectura y Hoja de Ruta para Escalado Futuro

Cuando el negocio crezca o se amplíe la operación comercial:

```text
                                  ┌──► Botica Sede 1 (POS Mostrador)
                                  ├──► Botica Sede 2 (POS Mostrador)
                                  └──► Portal Web Dueño (Reportes & ML)
                                                │
                                                ▼
                                    [ Cloud Load Balancer ]
                                                │
                         ┌──────────────────────┴──────────────────────┐
                         ▼                                             ▼
              [ Instancia Backend 1 ]                       [ Instancia Backend 2 ]
                         │                                             │
                         └──────────────────────┬──────────────────────┘
                                                ▼
                                     [ Redis Cache & Cola ]
                                                │ (Reentrenamiento nocturno)
                                                ▼
                                    [ PostgreSQL 16 Primario ]
                                       ├── Kardex Particionado por Año
                                       └── Réplica de Lectura para Reportes
```

### 1. Soporte Multi-Sucursal / Multi-Sede
* Agregar `sucursal_id` como clave foránea en las entidades `lotes`, `ventas` y `kardex`.
* Implementar transferencias de inventario entre sedes (`TRASLADO_SALIDA` en Sede A y `TRASLADO_ENTRADA` en Sede B).

### 2. Procesamiento Asíncrono en Segundo Plano (Celery / Redis)
* Desacoplar el reentrenamiento del modelo de Machine Learning y la generación de reportes masivos para ejecutarse de forma programada (ej. madrugadas a las 2:00 AM) sin consumir CPU del servidor durante la atención de clientes.

### 3. Particionamiento de Base de Datos para Alto Volumen
* Al acumular cientos de miles de transacciones, aplicar particionamiento por rangos de fecha en PostgreSQL (`PARTITION BY RANGE (fecha_hora)`) en las tablas `kardex` y `detalle_ventas` para garantizar que las consultas sigan respondiendo en milisegundos.

### 4. Automatización de Notificaciones Externas
* Conectar webhooks hacia WhatsApp Business API o correo para despachar alertas proactivas:
  * *"Alerta de Inventario: 3 medicamentos entraron en estado CRÍTICO hoy"*.
  * *"Alerta Sanitaria: El lote LOT-2026-A vence en 15 días con 40 unidades en stock"*.
