# CONTEXTO DE PROYECTO: SISTEMA WEB DE GESTIÓN DE INVENTARIO Y POS PARA BOTICAS

## 1. Visión General del Producto
* **Dominio:** Farmacias y boticas independientes.
* **Problema Principal:** Desabastecimiento de medicamentos clave, sobrestock de productos de baja rotación, capital inmovilizado y pérdidas económicas por vencimiento de medicamentos en mostrador.
* **Solución:** **Sistema Web moderno y Cloud-Ready** contenerizado con Docker (**FastAPI + PostgreSQL 16 + React con Vite y Tailwind CSS**) que gestiona compras, ventas en mostrador mediante lector de código de barras USB (HID) en el navegador, control de inventario bajo estándar **FEFO (First Expired, First Out)** y un motor integrado de **Machine Learning** para clasificar rotación y generar órdenes de compra sugeridas.

---

## 2. Reglas Críticas de Negocio Farmacéutico
1. **Regla FEFO Estricta (*First Expired, First Out*):**
   * No se descuenta stock de forma genérica. Todo producto con existencia debe estar vinculado a un registro de **Lote** con fecha de vencimiento.
   * Al escanear un producto en el POS Web, el sistema descuenta automáticamente del lote vigente cuya fecha de vencimiento sea la más próxima (usando bloqueo de fila transaccional en PostgreSQL para evitar condiciones de carrera entre cajeros).
2. **Fraccionamiento de Presentaciones:**
   * Un medicamento puede comprarse en caja pero venderse por caja completa, blíster o pastilla/unidad suelta.
   * La base de datos maneja una unidad mínima de control (tableta/mililitro/unidad) y un factor de conversión por presentación para no descuadrar el Kardex.
3. **Inmutabilidad del Kardex:**
   * Las cantidades de stock nunca se modifican directamente con un simple `UPDATE` aislado. Cada cambio genera obligatoriamente un registro auditable de movimiento (`VENTA`, `COMPRA`, `MERMA_VENCIMIENTO`, `AJUSTE_INVENTARIO`).
4. **Respuesta Rápida en Mostrador e Integración Web con Hardware:**
   * **Lector de Código de Barras (USB HID):** El lector actúa como un teclado de alta velocidad que inyecta los dígitos del código seguidos de la tecla `Enter`. El frontend React captura esta ráfaga mediante un hook global/input listener y consulta la API en **< 100 ms**.
   * **Operación 100% por Teclado:** La interfaz del POS es operable íntegramente con atajos (`Enter`, `Esc`, teclas de función `F1`-`F12`) para máxima velocidad de despacho.
   * **Impresión Web de Tickets:** Generación de comprobantes/tickets en formato térmico (80mm/58mm) mediante hoja de estilos `@media print` optimizada para disparo directo desde el navegador.

---

## 3. Arquitectura del Sistema, Stack y Despliegue

### Diagrama de Arquitectura
```text
[ Lector USB (HID) / Impresora Térmica ]
             │ (Eventos de Teclado / Web Print)
             ▼
[ Frontend Web: React + Vite + Tailwind CSS v4 ]
  (Sistema de Diseño: DesingBotica.md - Estilo Dub)
             │ (REST API / JSON / JWT)
             ▼
[ Backend: FastAPI (Python 3.11+) ]
     ├── SQLAlchemy 2.0 ORM + Pydantic v2 (Transacciones ACID)
     ├── Engine de Machine Learning (LightGBM / Scikit-learn)
     └── Servicios de Negocio (FEFO, Kardex, Alertas)
             │
             ▼
[ Base de Datos: PostgreSQL 16 ]
```

### Estrategia de Entorno y Despliegue Web
* **Desarrollo Equipos (Local):** Contenedores orquestados con `docker-compose.yml` para garantizar paridad exacta entre desarrolladores.
* **Despliegue Cloud Demo / Staging (Costo $0):**
  * **Frontend:** Vercel / Netlify.
  * **Base de Datos:** Supabase / Neon.tech (PostgreSQL gestionado).
  * **Backend:** Render / Railway.
* **Despliegue Producción Comercial:**
  * VPS Linux (Hetzner / DigitalOcean) ejecutando Docker Compose 24/7 con dominio + HTTPS (Nginx/Caddy), o servidor local en botica accesible vía LAN / Tailscale.

### Estructura del Monorepo
```text
botica-pos-ml/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── PROJECT_CONTEXT.md
├── DesingBotica.md           # Reglas estrictas de UI/UX y Design System (Dub)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── core/             # Configuración, DB session, seguridad JWT
│   │   ├── models/           # Modelos SQLAlchemy (Producto, Lote, Venta, Kardex)
│   │   ├── schemas/          # Esquemas Pydantic v2 para validación I/O
│   │   ├── api/v1/           # Endpoints REST (auth, pos, inventario, ml, reportes)
│   │   ├── services/         # Lógica transaccional FEFO, cálculo de Kardex
│   │   └── ml/               # Modelos de predicción, pipelines y entrenamiento
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/       # UI reutilizable basada en DesingBotica.md
│       ├── pages/            # POS, Inventario, Lotes, Compras, Dashboard ML
│       ├── hooks/            # useBarcodeScanner (HID), useKeyboardShortcuts
│       ├── services/         # Cliente HTTP (Axios / Fetch)
│       └── styles/           # Tokens CSS y configuración Tailwind v4
└── scripts/
    ├── init_db.sql
    ├── generate_fake_data.py
    └── windows_backup.bat
```

---

## 4. Sistema de Diseño y Reglas de Interfaz (`DesingBotica.md`)
Toda construcción de interfaz en el frontend debe regirse estrictamente por las reglas definidas en [`DesingBotica.md`](file:///c:/Users/josep/OneDrive/Desktop/botica-pos-ml/DesingBotica.md) (*Dub — Style Reference*):
1. **Filosofía Border-First (Sin sombras pesadas):**
   * Fondo base blanco puro (`--color-canvas-white: #ffffff`) y superficies secundarias en `--color-paper-mist: #f5f5f5`.
   * Todos los contenedores y tarjetas (`Dashboard Card`) se definen con bordes finos de `1px solid #e5e5e5` (`--color-ash`), sin sombras de elevación.
2. **Paleta Cromática y Acentos:**
   * Tipografía principal en `--color-charcoal: #171717` y texto secundario en `--color-fog: #737373`.
   * Botón de acción principal (`Primary Action CTA`) en negro alto contraste (`#000000` o `#0a0a0a`) o `--color-deep-sapphire: #1e40af` (máximo uno por vista principal).
   * Acento de marca e indicadores clave en `--color-electric-blue: #2563eb`.
   * Etiquetas de estado (Pills) con fondos suaves: `--color-soft-mint: #dcfce7` / `--color-vivid-green: #16a34a` (vigente/completado), `--color-tangerine: #ea580c` (alerta/próximo a vencer), `--color-lavender: #7c3aed` (sugerencia ML).
3. **Tipografía y Densidad Compacta:**
   * **Satoshi (weight 500):** Exclusivo para títulos display grandes (`36px–48px`).
   * **Inter (weights 400, 500, 600):** Fuente de trabajo para toda la UI, tablas y textos (`11px–30px`, con `14px–16px` como estándar).
   * **Geist Mono:** Obligatorio para códigos de barras, SKUs, números de lote, fechas de vencimiento, precios y atajos de teclado (`F1`–`F12`).
4. **Vocabulario Estricto de Radios (`border-radius`):**
   * `9999px` para pills, tags y badges de estado.
   * `12px` para tarjetas de dashboard (`Dashboard Card`).
   * `8px` para botones.
   * `6px` para inputs (con borde distintivo de alto contraste `#000000` en foco/énfasis).
   * `16px` para contenedores destacados grandes.

---

## 5. Esquema de Base de Datos Base (Entidades Principales)
* **`productos`**: `id`, `codigo_barras` (UNIQUE, indexado), `nombre`, `principio_activo`, `concentracion`, `laboratorio`, `precio_venta_caja`, `precio_venta_unitario`, `fraccionable` (bool), `unidades_por_caja`, `stock_minimo`.
* **`lotes`**: `id`, `producto_id` (FK), `numero_lote`, `fecha_vencimiento` (indexado para FEFO), `stock_actual` (en unidad mínima), `costo_compra_unitario`.
* **`ventas`**: `id`, `fecha_hora`, `total`, `metodo_pago` (`efectivo`, `tarjeta`, `billetera_digital`), `usuario_id` (FK).
* **`detalle_ventas`**: `id`, `venta_id` (FK), `lote_id` (FK), `producto_id` (FK), `tipo_presentacion` (`caja`, `blister`, `unidad`), `cantidad_unidades` (descontadas en unidad mínima), `precio_unitario`, `subtotal`.
* **`kardex`**: `id`, `lote_id` (FK), `tipo_movimiento` (`VENTA`, `COMPRA`, `MERMA_VENCIMIENTO`, `AJUSTE_INVENTARIO`), `cantidad`, `stock_resultante`, `fecha_hora`, `glosa`.

---

## 6. Configuración de Entorno con Docker (`docker-compose.yml`)
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: botica_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123}
      POSTGRES_DB: ${POSTGRES_DB:-botica_db}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - botica_net

  backend:
    build: ./backend
    container_name: botica_backend
    restart: always
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD:-admin123}@db:5432/${POSTGRES_DB:-botica_db}
    depends_on:
      - db
    networks:
      - botica_net

  frontend:
    build: ./frontend
    container_name: botica_frontend
    restart: always
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - botica_net

volumes:
  pgdata:

networks:
  botica_net:
    driver: bridge
```

---

## 7. Flujo de Git y Trabajo Colaborativo en Equipo

### 1. Convención de Ramas
* `main`: Producción estable. Solo recibe Pull Requests desde `develop`.
* `develop`: Integración continua. Aquí converge todo el trabajo revisado del equipo.
* Ramas de trabajo:
  * `feature/<modulo>-<descripcion>` (ej. `feature/pos-barcode-listener`, `feature/fefo-deduction-logic`).
  * `fix/<descripcion>` (ej. `fix/lote-stock-negative`).

### 2. Estándar de Commits (Conventional Commits)
* `feat`: Nueva funcionalidad para el usuario.
* `fix`: Solución a un error reportado.
* `refactor`: Reestructuración de código sin alterar comportamiento.
* `test`: Adición o corrección de pruebas unitarias/integración.
* `docs`: Cambios exclusivamente en documentación o diagramas.

### 3. Protocolo de Integración Diaria
1. Antes de iniciar una tarea:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nombre-tarea
   ```
2. Al terminar la tarea: subir la rama (`git push -u origin feature/nombre-tarea`) y abrir el Pull Request hacia `develop`.
3. **Revisión obligatoria (Code Review):** El compañero debe revisar los cambios, validar que respeten [`DesingBotica.md`](file:///c:/Users/josep/OneDrive/Desktop/botica-pos-ml/DesingBotica.md) (si es frontend) y que no rompan Docker ni migraciones, aprobar el PR y fusionar con **Squash and Merge**.

---

## 8. Módulo de Machine Learning (Estrategia Operativa)
* **Problema de Arranque en Frío (*Cold Start*):** En el lanzamiento inicial no existen datos históricos reales digitalizados.
* **Generación de Datos Sintéticos:** Se utilizará `scripts/generate_fake_data.py` para inyectar 12 meses de ventas simuladas realistas (con estacionalidad de enfermedades respiratorias/digestivas y vencimientos) en PostgreSQL para calibrar y validar los modelos.
* **Features Principales:**
  * Ventas históricas agrupadas por día y semana.
  * Lags temporales ($t-7$, $t-14$, $t-30$).
  * Indicador de día de la semana y estacionalidad mensual.
  * Días restantes para el vencimiento del lote activo y cobertura de stock actual.
* **Salida del Modelo:** Endpoint `GET /api/v1/ml/reorder-suggestions` que devuelve una lista priorizada de SKUs que entrarán en quiebre de stock o rotación crítica en los próximos 15 días, indicando la cantidad exacta sugerida a pedir a las droguerías.
