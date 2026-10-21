# CONTEXTO DE PROYECTO: SISTEMA DE GESTIÓN DE INVENTARIO Y POS PARA BOTICAS

## 1. Visión General del Producto
* **Dominio:** Farmacias y boticas independientes.
* **Problema Principal:** Desabastecimiento de medicamentos clave, sobrestock de productos de baja rotación, capital inmovilizado y pérdidas económicas por vencimiento de medicamentos en mostrador.
* **Solución:** Sistema local web contenerizado con Docker (FastAPI + PostgreSQL + React) que gestiona compras, ventas mediante lector de código de barras (HID), control de inventario bajo estándar **FEFO (First Expired, First Out)** y un motor de Machine Learning para clasificar rotación y generar órdenes de compra sugeridas.

---

## 2. Reglas Críticas de Negocio Farmacéutico
1. **Regla FEFO Estricta:**
   * No se descuenta stock de forma genérica. Todo producto con existencia debe estar vinculado a un registro de **Lote** con fecha de vencimiento.
   * Al escanear un producto en el POS, el sistema descuenta automáticamente del lote vigente cuya fecha de vencimiento sea la más próxima.
2. **Fraccionamiento de Presentaciones:**
   * Un medicamento puede comprarse en caja pero venderse por caja completa, blíster o pastilla suelta.
   * La base de datos debe manejar una unidad mínima de control (tableta/mililitro) y un factor de conversión por presentación para no descuadrar el Kardex.
3. **Inmutabilidad del Kardex:**
   * Las cantidades de stock nunca se modifican directamente con un simple `UPDATE`. Cada cambio debe generar un registro de movimiento (`VENTA`, `COMPRA`, `MERMA_VENCIMIENTO`, `AJUSTE_INVENTARIO`).
4. **Respuesta Rápida en Mostrador:**
   * El POS debe responder a la lectura del código de barras en menos de 100 ms.
   * La interfaz debe ser operable 100% mediante atajos de teclado (`Enter`, teclas de función `F1`-`F12`).

---

## 3. Arquitectura del Sistema y Stack Tecnológico

```text
[ Lector USB (HID) / Ticketera ]
             │
             ▼
[ Frontend: React + Vite + Tailwind CSS ]
             │ (REST API / JWT)
             ▼
[ Backend: FastAPI (Python 3.11+) ]
     ├── SQLAlchemy ORM + Pydantic v2
     ├── Engine de Machine Learning (LightGBM / Scikit-learn)
     └── Tareas / Reportes programados
             │
             ▼
[ Base de Datos: PostgreSQL 16 ]

botica-system/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── PROJECT_CONTEXT.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── core/         # Configuración, DB session, seguridad JWT
│   │   ├── models/       # Modelos SQLAlchemy (Producto, Lote, Venta, etc.)
│   │   ├── schemas/      # Esquemas Pydantic para I/O
│   │   ├── api/v1/       # Endpoints (auth, pos, inventario, reportes)
│   │   ├── services/     # Lógica FEFO, cálculo de Kardex
│   │   └── ml/           # Modelos de predicción, pipelines y seeders
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/   # UI reutilizable (shadcn/ui o Tailwind puro)
│       ├── pages/        # POS, Inventario, Compras, Dashboard
│       ├── hooks/        # Manejo de escaneo de código de barras, atajos
│       └── services/     # Cliente HTTP (Axios / Fetch)
└── scripts/
    ├── init_db.sql
    ├── generate_fake_data.py
    └── windows_backup.bat

4. Esquema de Base de Datos Base (Entidades Principales)
productos: id, codigo_barras (UNIQUE, indexado), nombre, principio_activo, concentracion, laboratorio, precio_venta_caja, fraccionable (bool), unidades_por_caja, stock_minimo.

lotes: id, producto_id (FK), numero_lote, fecha_vencimiento (indexado), stock_actual, costo_compra_unitario.

ventas: id, fecha_hora, total, metodo_pago (efectivo, tarjeta, billetera_digital), usuario_id (FK).

detalle_ventas: id, venta_id (FK), lote_id (FK), producto_id (FK), cantidad_unidades, precio_unitario, subtotal.

kardex: id, lote_id (FK), tipo_movimiento, cantidad, stock_resultante, fecha_hora, glosa.

5. Configuración de Entorno Local con Docker
Archivo docker-compose.yml
version: '3.8'

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

6. Flujo de Git y Simulación de Entorno Real
Para trabajar en equipo remoto sin colisiones:

1. Convención de Ramas
main: Producción. Solo se toca mediante Pull Requests desde develop.

develop: Integración continua. Aquí converge el trabajo del equipo.

Ramas de trabajo:

feature/<modulo>-<descripcion> (ej. feature/pos-barcode-listener, feature/fefo-deduction-logic).

fix/<descripcion> (ej. fix/lote-stock-negative).

2. Estándar de Commits (Conventional Commits)
feat: Nueva funcionalidad para el usuario.

fix: Solución a un error reportado.

refactor: Reestructuración de código sin alterar comportamiento.

test: Adición o corrección de pruebas unitarias/integración.

docs: Cambios exclusivamente en documentación o diagramas.

3. Protocolo de Integración Diaria
Antes de iniciar la jornada:

Bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-tarea
Al terminar la tarea: subir la rama y abrir el Pull Request hacia develop.

Revisión obligatoria: El compañero debe revisar los cambios, validar que no rompa la estructura de Docker ni las migraciones, y aprobar el PR. Se fusiona usando Squash and Merge.

7. Módulo de Machine Learning (Estrategia Operativa)
Problema de Arranque en Frío (Cold Start): En el lanzamiento de la botica no habrá datos digitales históricos.

Generación de Datos Sintéticos: Se usará el script scripts/generate_fake_data.py para inyectar 12 meses de ventas simuladas en PostgreSQL para calibrar y testear los modelos.

Features Principales:

Ventas históricas agrupadas por día y semana.

Lags temporales ($t-7$, $t-14$, $t-30$).

Indicador de día de la semana y estacionalidad mensual.

Días restantes para el vencimiento del lote activo.

Salida del Modelo: Un endpoint /api/v1/ml/reorder-suggestions que devuelva una lista priorizada de SKUs que entrarán en rotación crítica en los siguientes 15 días, indicando la cantidad exacta sugerida a pedir a las droguerías.