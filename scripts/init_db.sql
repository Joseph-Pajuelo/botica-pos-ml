-- =============================================================================
-- ESQUEMA DE BASE DE DATOS: BOTICA POS & INVENTARIO ML (PostgreSQL 16)
-- Cumple reglas farmacéuticas: FEFO estricto, Fraccionamiento y Kardex Inmutable
-- =============================================================================

-- 1. Tipos Enumerados de Dominio
DO $$ BEGIN
    CREATE TYPE rol_usuario_enum AS ENUM ('ADMIN', 'FARMACEUTICO', 'CAJERO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago_enum AS ENUM ('EFECTIVO', 'TARJETA', 'BILLETERA_DIGITAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_presentacion_enum AS ENUM ('CAJA', 'BLISTER', 'UNIDAD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento_kardex_enum AS ENUM ('VENTA', 'COMPRA', 'MERMA_VENCIMIENTO', 'AJUSTE_INVENTARIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario_enum NOT NULL DEFAULT 'CAJERO',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla de Productos (Catálogo Maestro y Factor de Conversión)
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(64) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    principio_activo VARCHAR(200),
    concentracion VARCHAR(100),
    laboratorio VARCHAR(150),
    precio_venta_caja NUMERIC(10, 2) NOT NULL,
    precio_venta_blister NUMERIC(10, 2),
    precio_venta_unitario NUMERIC(10, 2),
    fraccionable BOOLEAN NOT NULL DEFAULT FALSE,
    unidades_por_caja INTEGER NOT NULL DEFAULT 1,
    unidades_por_blister INTEGER,
    stock_minimo INTEGER NOT NULL DEFAULT 10,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_productos_unidades_caja_positiva CHECK (unidades_por_caja >= 1),
    CONSTRAINT ck_productos_unidades_blister_positiva CHECK (unidades_por_blister IS NULL OR unidades_por_blister >= 1),
    CONSTRAINT ck_productos_stock_minimo_no_negativo CHECK (stock_minimo >= 0),
    CONSTRAINT ck_productos_precio_caja_positivo CHECK (precio_venta_caja > 0)
);

CREATE INDEX IF NOT EXISTS ix_productos_codigo_barras ON productos (codigo_barras);
CREATE INDEX IF NOT EXISTS ix_productos_nombre ON productos (nombre);
CREATE INDEX IF NOT EXISTS ix_productos_principio_activo ON productos (principio_activo);

-- 4. Tabla de Lotes (Control FEFO Estricto)
CREATE TABLE IF NOT EXISTS lotes (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    numero_lote VARCHAR(80) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    stock_inicial INTEGER NOT NULL,
    stock_actual INTEGER NOT NULL,
    costo_compra_unitario NUMERIC(10, 4) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lotes_producto_numero UNIQUE (producto_id, numero_lote),
    CONSTRAINT ck_lotes_stock_actual_no_negativo CHECK (stock_actual >= 0),
    CONSTRAINT ck_lotes_stock_inicial_positivo CHECK (stock_inicial > 0),
    CONSTRAINT ck_lotes_costo_no_negativo CHECK (costo_compra_unitario >= 0)
);

-- Índice compuesto clave para selección FEFO en < 100ms
CREATE INDEX IF NOT EXISTS ix_lotes_fefo_lookup ON lotes (producto_id, fecha_vencimiento ASC, stock_actual);

-- 5. Tabla de Ventas (Cabecera POS)
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago metodo_pago_enum NOT NULL DEFAULT 'EFECTIVO',
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
    anulada BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_ventas_total_no_negativo CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS ix_ventas_fecha_hora ON ventas (fecha_hora);

-- 6. Tabla de Detalle de Ventas (Trazabilidad por Lote y Presentación)
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo_presentacion tipo_presentacion_enum NOT NULL DEFAULT 'CAJA',
    cantidad_presentacion INTEGER NOT NULL DEFAULT 1,
    cantidad_unidades INTEGER NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    CONSTRAINT ck_detalle_cantidad_pres_positiva CHECK (cantidad_presentacion > 0),
    CONSTRAINT ck_detalle_cantidad_unid_positiva CHECK (cantidad_unidades > 0),
    CONSTRAINT ck_detalle_precio_no_negativo CHECK (precio_unitario >= 0),
    CONSTRAINT ck_detalle_subtotal_no_negativo CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS ix_detalle_ventas_venta_id ON detalle_ventas (venta_id);
CREATE INDEX IF NOT EXISTS ix_detalle_ventas_producto_id ON detalle_ventas (producto_id);
CREATE INDEX IF NOT EXISTS ix_detalle_ventas_lote_id ON detalle_ventas (lote_id);

-- 7. Tabla de Kardex (Auditoría Inmutable de Inventario)
CREATE TABLE IF NOT EXISTS kardex (
    id SERIAL PRIMARY KEY,
    lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
    tipo_movimiento tipo_movimiento_kardex_enum NOT NULL,
    cantidad INTEGER NOT NULL,
    stock_resultante INTEGER NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    glosa VARCHAR(255),
    referencia_venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
    CONSTRAINT ck_kardex_cantidad_no_cero CHECK (cantidad != 0),
    CONSTRAINT ck_kardex_stock_resultante_no_negativo CHECK (stock_resultante >= 0)
);

CREATE INDEX IF NOT EXISTS ix_kardex_lote_id ON kardex (lote_id);
CREATE INDEX IF NOT EXISTS ix_kardex_fecha_hora ON kardex (fecha_hora);
