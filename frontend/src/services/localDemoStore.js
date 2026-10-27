/**
 * Motor local de respaldo (Fallback FEFO + Kardex + ML + Auth + Export en memoria/localStorage).
 * Se activa automáticamente SOLO cuando el backend FastAPI (localhost:8000) no está encendido localmente,
 * permitiendo probar el 100% de la interfaz Frontend sin errores de red.
 */

const STORAGE_KEY = 'botica_pos_ml_demo_store_v2'

const DEMO_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    nombre_completo: 'Administrador General Botica',
    rol: 'ADMIN',
    activo: true,
  },
  {
    id: 2,
    username: 'farmaceutico',
    password: 'farma123',
    nombre_completo: 'Q.F. Director Técnico',
    rol: 'FARMACEUTICO',
    activo: true,
  },
  {
    id: 3,
    username: 'cajero',
    password: 'caja123',
    nombre_completo: 'Cajero de Mostrador Principal',
    rol: 'CAJERO',
    activo: true,
  },
]

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function createInitialState() {
  const nowIso = new Date().toISOString()

  const productos = [
    {
      id: 1,
      codigo_barras: '7750100000011',
      nombre: 'Paracetamol 500mg Caja x 100 tab',
      principio_activo: 'Paracetamol',
      concentracion: '500mg',
      laboratorio: 'Portugal',
      precio_venta_caja: 18.0,
      precio_venta_blister: 2.0,
      precio_venta_unitario: 0.25,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 120,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 28,
      _costo_unitario: 0.09,
    },
    {
      id: 2,
      codigo_barras: '7750100000028',
      nombre: 'Amoxicilina 500mg Caja x 100 cap',
      principio_activo: 'Amoxicilina',
      concentracion: '500mg',
      laboratorio: 'Genfar',
      precio_venta_caja: 35.0,
      precio_venta_blister: 4.0,
      precio_venta_unitario: 0.5,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 100,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 22,
      _costo_unitario: 0.21,
    },
    {
      id: 3,
      codigo_barras: '7750100000035',
      nombre: 'Ibuprofeno 400mg Caja x 100 tab',
      principio_activo: 'Ibuprofeno',
      concentracion: '400mg',
      laboratorio: 'Farmindustria',
      precio_venta_caja: 22.0,
      precio_venta_blister: 2.5,
      precio_venta_unitario: 0.3,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 80,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 18,
      _costo_unitario: 0.12,
    },
    {
      id: 4,
      codigo_barras: '7750100000042',
      nombre: 'Panadol Antigripal NF Caja x 100 tab',
      principio_activo: 'Paracetamol + Fenilefrina + Clorfenamina',
      concentracion: '500mg/5mg/2mg',
      laboratorio: 'GSK',
      precio_venta_caja: 85.0,
      precio_venta_blister: 9.0,
      precio_venta_unitario: 1.0,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 60,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 16,
      _costo_unitario: 0.55,
    },
    {
      id: 5,
      codigo_barras: '7750100000059',
      nombre: 'Omeprazol 20mg Caja x 100 cap',
      principio_activo: 'Omeprazol',
      concentracion: '20mg',
      laboratorio: 'IQFarma',
      precio_venta_caja: 28.0,
      precio_venta_blister: 3.0,
      precio_venta_unitario: 0.35,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 70,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 14,
      _costo_unitario: 0.15,
    },
    {
      id: 6,
      codigo_barras: '7750100000066',
      nombre: 'Loratadina 10mg Caja x 100 tab',
      principio_activo: 'Loratadina',
      concentracion: '10mg',
      laboratorio: 'Medrock',
      precio_venta_caja: 20.0,
      precio_venta_blister: 2.5,
      precio_venta_unitario: 0.3,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 50,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 3,
      _costo_unitario: 0.1,
    },
    {
      id: 7,
      codigo_barras: '7750100000073',
      nombre: 'Losartán Potásico 50mg Caja x 100 tab',
      principio_activo: 'Losartán',
      concentracion: '50mg',
      laboratorio: 'AC Farma',
      precio_venta_caja: 32.0,
      precio_venta_blister: 3.5,
      precio_venta_unitario: 0.4,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 90,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 10,
      _costo_unitario: 0.18,
    },
    {
      id: 8,
      codigo_barras: '7750100000080',
      nombre: 'Ambroxol Jarabe Pediátrico 15mg/5ml Fco 120ml',
      principio_activo: 'Ambroxol',
      concentracion: '15mg/5ml',
      laboratorio: 'Hersil',
      precio_venta_caja: 14.5,
      precio_venta_blister: null,
      precio_venta_unitario: null,
      fraccionable: false,
      unidades_por_caja: 1,
      unidades_por_blister: null,
      stock_minimo: 8,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 2,
      _costo_unitario: 8.2,
    },
    {
      id: 9,
      codigo_barras: '7750100000097',
      nombre: 'Panadol 500mg Marca Original Caja x 100 tab',
      principio_activo: 'Paracetamol',
      concentracion: '500mg',
      laboratorio: 'GSK',
      precio_venta_caja: 42.0,
      precio_venta_blister: 4.5,
      precio_venta_unitario: 0.5,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 50,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 12,
      _costo_unitario: 0.25,
    },
    {
      id: 10,
      codigo_barras: '7750100000103',
      nombre: 'Paracetamol 500mg Genfar Caja x 100 tab',
      principio_activo: 'Paracetamol',
      concentracion: '500mg',
      laboratorio: 'Genfar',
      precio_venta_caja: 21.0,
      precio_venta_blister: 2.3,
      precio_venta_unitario: 0.3,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 80,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 15,
      _costo_unitario: 0.11,
    },
    {
      id: 11,
      codigo_barras: '7750100000110',
      nombre: 'Doloral 400mg Marca Caja x 100 tab',
      principio_activo: 'Ibuprofeno',
      concentracion: '400mg',
      laboratorio: 'Hersil',
      precio_venta_caja: 38.0,
      precio_venta_blister: 4.0,
      precio_venta_unitario: 0.45,
      fraccionable: true,
      unidades_por_caja: 100,
      unidades_por_blister: 10,
      stock_minimo: 40,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 9,
      _costo_unitario: 0.22,
    },
  ]

  const lotes = [
    {
      id: 1,
      producto_id: 1,
      numero_lote: 'LOT-2026-01A',
      fecha_vencimiento: addDays(45),
      stock_inicial: 200,
      stock_actual: 25,
      costo_compra_unitario: 0.09,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 2,
      producto_id: 1,
      numero_lote: 'LOT-2027-01B',
      fecha_vencimiento: addDays(225),
      stock_inicial: 100,
      stock_actual: 40,
      costo_compra_unitario: 0.09,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 3,
      producto_id: 2,
      numero_lote: 'LOT-2026-02A',
      fecha_vencimiento: addDays(90),
      stock_inicial: 200,
      stock_actual: 30,
      costo_compra_unitario: 0.21,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 4,
      producto_id: 2,
      numero_lote: 'LOT-2027-02B',
      fecha_vencimiento: addDays(270),
      stock_inicial: 100,
      stock_actual: 50,
      costo_compra_unitario: 0.21,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 5,
      producto_id: 3,
      numero_lote: 'LOT-2026-03A',
      fecha_vencimiento: addDays(180),
      stock_inicial: 300,
      stock_actual: 190,
      costo_compra_unitario: 0.12,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 6,
      producto_id: 4,
      numero_lote: 'LOT-2026-04A',
      fecha_vencimiento: addDays(210),
      stock_inicial: 100,
      stock_actual: 40,
      costo_compra_unitario: 0.55,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 7,
      producto_id: 5,
      numero_lote: 'LOT-2026-05A',
      fecha_vencimiento: addDays(300),
      stock_inicial: 200,
      stock_actual: 150,
      costo_compra_unitario: 0.15,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 8,
      producto_id: 6,
      numero_lote: 'LOT-2026-06A',
      fecha_vencimiento: addDays(20),
      stock_inicial: 200,
      stock_actual: 180,
      costo_compra_unitario: 0.1,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 9,
      producto_id: 7,
      numero_lote: 'LOT-2026-07A',
      fecha_vencimiento: addDays(365),
      stock_inicial: 500,
      stock_actual: 420,
      costo_compra_unitario: 0.18,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 10,
      producto_id: 8,
      numero_lote: 'LOT-2026-08A',
      fecha_vencimiento: addDays(190),
      stock_inicial: 24,
      stock_actual: 4,
      costo_compra_unitario: 8.2,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
    {
      id: 11,
      producto_id: 10,
      numero_lote: 'LOT-2026-10A',
      fecha_vencimiento: addDays(240),
      stock_inicial: 300,
      stock_actual: 220,
      costo_compra_unitario: 0.11,
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    },
  ]

  const kardex = lotes.map((l, idx) => ({
    id: idx + 1,
    lote_id: l.id,
    tipo_movimiento: 'COMPRA',
    cantidad: l.stock_inicial,
    stock_resultante: l.stock_actual,
    fecha_hora: nowIso,
    glosa: `Stock inicial de arranque Cold-Start (${l.numero_lote})`,
    referencia_venta_id: null,
  }))

  const ventas = [
    {
      id: 1,
      fecha_hora: nowIso,
      total: 6.0,
      metodo_pago: 'EFECTIVO',
      usuario_id: null,
      anulada: false,
      detalles: [
        {
          id: 1,
          lote_id: 1,
          producto_id: 1,
          tipo_presentacion: 'BLISTER',
          cantidad_presentacion: 3,
          cantidad_unidades: 30,
          precio_unitario: 2.0,
          subtotal: 6.0,
        },
      ],
    },
  ]

  return { productos, lotes, kardex, ventas }
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  const initial = createInitialState()
  saveStore(initial)
  return initial
}

function saveStore(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function getLotesFefoVigentes(state, productoId) {
  const hoy = new Date().toISOString().slice(0, 10)
  return state.lotes
    .filter(
      (l) =>
        Number(l.producto_id) === Number(productoId) &&
        l.activo &&
        l.stock_actual > 0 &&
        l.fecha_vencimiento >= hoy
    )
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
}

function enriquecerProducto(state, prod) {
  const lotesFefo = getLotesFefoVigentes(state, prod.id)
  const stockTotal = lotesFefo.reduce((acc, l) => acc + l.stock_actual, 0)
  const primero = lotesFefo[0] || null
  return {
    ...prod,
    stock_total_vigente: stockTotal,
    proximo_vencimiento: primero ? primero.fecha_vencimiento : null,
    lote_fefo_numero: primero ? primero.numero_lote : null,
  }
}

export const localDemoStore = {
  autenticar: ({ username, password }) => {
    const cleanUser = String(username || '').trim().toLowerCase()
    const cleanPass = String(password || '')
    const found = DEMO_USERS.find(
      (u) => u.username === cleanUser && u.password === cleanPass
    )
    if (!found) {
      const err = new Error('Credenciales inválidas')
      err.response = {
        status: 401,
        data: { detail: 'Usuario o contraseña incorrectos. Verifica tus credenciales.' },
      }
      throw err
    }
    const nowIso = new Date().toISOString()
    return {
      access_token: `demo-jwt-token-${found.username}-${Date.now()}`,
      token_type: 'bearer',
      expira_en_minutos: 480,
      usuario: {
        id: found.id,
        username: found.username,
        nombre_completo: found.nombre_completo,
        rol: found.rol,
        activo: found.activo,
        creado_en: nowIso,
        actualizado_en: nowIso,
      },
    }
  },

  resetSeed: (mesesHistoria = 12) => {
    const fresh = createInitialState()
    saveStore(fresh)
    return {
      mensaje: `Datos sintéticos Cold-Start cargados (${mesesHistoria} meses de historial simulado).`,
      productos_creados: fresh.productos.length,
      lotes_creados: fresh.lotes.length,
      ventas_simuladas: 2840,
      meses_historia: mesesHistoria,
    }
  },

  listarProductos: ({ buscar = '' } = {}) => {
    const state = loadStore()
    const q = buscar.trim().toLowerCase()
    const filtrados = !q
      ? state.productos
      : state.productos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.principio_activo || '').toLowerCase().includes(q) ||
            p.codigo_barras.toLowerCase().includes(q)
        )
    return filtrados.map((p) => enriquecerProducto(state, p))
  },

  escanearBarcode: (codigoBarras) => {
    const state = loadStore()
    const prod = state.productos.find((p) => p.codigo_barras === codigoBarras.trim())
    if (!prod) {
      const err = new Error(`Código de barras ${codigoBarras} no registrado en el catálogo.`)
      err.response = { data: { detail: `Producto con código '${codigoBarras}' no encontrado.` } }
      throw err
    }
    return enriquecerProducto(state, prod)
  },

  buscarSustitutos: (productoId) => {
    const state = loadStore()
    const origen = state.productos.find((p) => Number(p.id) === Number(productoId))
    if (!origen || !origen.principio_activo) return []

    const terminoPa = origen.principio_activo.trim().toLowerCase()
    const candidatos = state.productos.filter(
      (p) =>
        Number(p.id) !== Number(origen.id) &&
        p.activo &&
        (p.principio_activo || '').toLowerCase().includes(terminoPa)
    )

    const sustitutos = candidatos
      .map((c) => enriquecerProducto(state, c))
      .filter((info) => info.stock_total_vigente > 0)
      .sort((a, b) => Number(a.precio_venta_caja) - Number(b.precio_venta_caja) || a.id - b.id)

    return sustitutos
  },

  crearProducto: (payload) => {
    const state = loadStore()
    if (state.productos.some((p) => p.codigo_barras === payload.codigo_barras)) {
      const err = new Error('Código duplicado')
      err.response = { data: { detail: `El código de barras ${payload.codigo_barras} ya existe.` } }
      throw err
    }
    const nowIso = new Date().toISOString()
    const nuevo = {
      ...payload,
      id: state.productos.reduce((m, p) => Math.max(m, p.id), 0) + 1,
      creado_en: nowIso,
      actualizado_en: nowIso,
      _demanda_diaria: 8,
      _costo_unitario: +(
        Number(payload.precio_venta_caja || 10) /
        (Number(payload.unidades_por_caja || 1) * 1.8)
      ).toFixed(2),
    }
    state.productos.unshift(nuevo)
    saveStore(state)
    return enriquecerProducto(state, nuevo)
  },

  actualizarProducto: (productoId, payload) => {
    const state = loadStore()
    const idx = state.productos.findIndex((p) => Number(p.id) === Number(productoId))
    if (idx < 0) throw new Error('Producto no encontrado')
    state.productos[idx] = {
      ...state.productos[idx],
      ...payload,
      actualizado_en: new Date().toISOString(),
    }
    saveStore(state)
    return enriquecerProducto(state, state.productos[idx])
  },

  registrarVenta: (payload) => {
    const state = loadStore()
    const ventaId = state.ventas.reduce((m, v) => Math.max(m, v.id), 0) + 1
    let nextDetalleId = 100 + ventaId * 10
    let nextKardexId = state.kardex.reduce((m, k) => Math.max(m, k.id), 0) + 1
    const nowIso = new Date().toISOString()

    let totalAcumulado = 0
    const detalles = []

    for (const item of payload.items) {
      const prod = state.productos.find((p) => Number(p.id) === Number(item.producto_id))
      if (!prod) throw new Error(`Producto #${item.producto_id} no encontrado`)

      const cantPres = Number(item.cantidad_presentacion) || 1
      let unidadesMinimas = cantPres
      let precioUnitario = Number(prod.precio_venta_caja)

      if (item.tipo_presentacion === 'CAJA') {
        unidadesMinimas = cantPres * Number(prod.unidades_por_caja || 1)
        precioUnitario = Number(prod.precio_venta_caja)
      } else if (item.tipo_presentacion === 'BLISTER') {
        unidadesMinimas = cantPres * Number(prod.unidades_por_blister || 10)
        precioUnitario = Number(prod.precio_venta_blister || prod.precio_venta_caja)
      } else {
        unidadesMinimas = cantPres
        precioUnitario = Number(prod.precio_venta_unitario || prod.precio_venta_caja)
      }

      const subtotalItem = +(cantPres * precioUnitario).toFixed(2)
      const lotesFefo = getLotesFefoVigentes(state, prod.id)
      const disponible = lotesFefo.reduce((acc, l) => acc + l.stock_actual, 0)

      if (disponible < unidadesMinimas) {
        const err = new Error('Stock insuficiente')
        err.response = {
          data: {
            detail: `Stock insuficiente para '${prod.nombre}': solicitado ${unidadesMinimas} unidades, disponible ${disponible} unidades.`,
          },
        }
        throw err
      }

      let pendientes = unidadesMinimas
      const precioPorUnidadMinima = subtotalItem / unidadesMinimas

      for (const lote of lotesFefo) {
        if (pendientes === 0) break
        const tomar = Math.min(lote.stock_actual, pendientes)
        lote.stock_actual -= tomar
        pendientes -= tomar

        const subLote =
          tomar === unidadesMinimas
            ? subtotalItem
            : +(precioPorUnidadMinima * tomar).toFixed(2)

        detalles.push({
          id: nextDetalleId++,
          lote_id: lote.id,
          producto_id: prod.id,
          tipo_presentacion: item.tipo_presentacion,
          cantidad_presentacion: cantPres,
          cantidad_unidades: tomar,
          precio_unitario: precioUnitario,
          subtotal: subLote,
        })

        state.kardex.unshift({
          id: nextKardexId++,
          lote_id: lote.id,
          tipo_movimiento: 'VENTA',
          cantidad: -tomar,
          stock_resultante: lote.stock_actual,
          fecha_hora: nowIso,
          glosa: `Venta POS #${ventaId} (${item.tipo_presentacion})`,
          referencia_venta_id: ventaId,
        })
      }

      totalAcumulado += subtotalItem
    }

    const nuevaVenta = {
      id: ventaId,
      fecha_hora: nowIso,
      total: +totalAcumulado.toFixed(2),
      metodo_pago: payload.metodo_pago || 'EFECTIVO',
      usuario_id: null,
      anulada: false,
      detalles,
    }

    state.ventas.unshift(nuevaVenta)
    saveStore(state)
    return nuevaVenta
  },

  listarVentas: () => {
    const state = loadStore()
    return state.ventas
  },

  obtenerVenta: (ventaId) => {
    const state = loadStore()
    return state.ventas.find((v) => Number(v.id) === Number(ventaId)) || null
  },

  registrarLote: (payload) => {
    const state = loadStore()
    const nowIso = new Date().toISOString()
    const nuevoLote = {
      id: state.lotes.reduce((m, l) => Math.max(m, l.id), 0) + 1,
      producto_id: Number(payload.producto_id),
      numero_lote: payload.numero_lote,
      fecha_vencimiento: payload.fecha_vencimiento,
      stock_inicial: Number(payload.stock_inicial),
      stock_actual: Number(payload.stock_inicial),
      costo_compra_unitario: Number(payload.costo_compra_unitario),
      activo: true,
      creado_en: nowIso,
      actualizado_en: nowIso,
    }
    state.lotes.push(nuevoLote)
    state.kardex.unshift({
      id: state.kardex.reduce((m, k) => Math.max(m, k.id), 0) + 1,
      lote_id: nuevoLote.id,
      tipo_movimiento: 'COMPRA',
      cantidad: nuevoLote.stock_inicial,
      stock_resultante: nuevoLote.stock_actual,
      fecha_hora: nowIso,
      glosa: payload.glosa || `Ingreso de lote ${nuevoLote.numero_lote}`,
      referencia_venta_id: null,
    })
    saveStore(state)
    return nuevoLote
  },

  listarLotesProducto: (productoId) => {
    const state = loadStore()
    return getLotesFefoVigentes(state, productoId)
  },

  obtenerAlertasVencimiento: (dias = 60) => {
    const state = loadStore()
    const limite = addDays(Number(dias))
    return state.lotes
      .filter((l) => l.activo && l.stock_actual > 0 && l.fecha_vencimiento <= limite)
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
  },

  registrarAjuste: (payload) => {
    const state = loadStore()
    const lote = state.lotes.find((l) => Number(l.id) === Number(payload.lote_id))
    if (!lote) throw new Error('Lote no encontrado')
    const cant = Number(payload.cantidad_unidades)
    if (lote.stock_actual < cant) {
      const err = new Error('Stock insuficiente en lote')
      err.response = {
        data: {
          detail: `Stock insuficiente en lote ${lote.numero_lote} (disponible: ${lote.stock_actual}).`,
        },
      }
      throw err
    }
    lote.stock_actual -= cant
    state.kardex.unshift({
      id: state.kardex.reduce((m, k) => Math.max(m, k.id), 0) + 1,
      lote_id: lote.id,
      tipo_movimiento: payload.tipo_movimiento,
      cantidad: -cant,
      stock_resultante: lote.stock_actual,
      fecha_hora: new Date().toISOString(),
      glosa: payload.glosa,
      referencia_venta_id: null,
    })
    saveStore(state)
    return lote
  },

  consultarKardexLote: (loteId) => {
    const state = loadStore()
    return state.kardex.filter((k) => Number(k.lote_id) === Number(loteId))
  },

  obtenerSugerenciasReorden: (soloCriticos = false) => {
    const state = loadStore()
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const sugerencias = state.productos.map((prod) => {
      const lotesFefo = getLotesFefoVigentes(state, prod.id)
      const stockActual = lotesFefo.reduce((acc, l) => acc + l.stock_actual, 0)
      const primero = lotesFefo[0] || null
      const diasVenc = primero
        ? Math.ceil((new Date(`${primero.fecha_vencimiento}T00:00:00`) - hoy) / 86400000)
        : null

      const tasaDiaria = Number(prod._demanda_diaria || 10)
      const v7 = Math.round(tasaDiaria * 7)
      const v14 = Math.round(tasaDiaria * 14)
      const v30 = Math.round(tasaDiaria * 30)
      const demanda15d = Math.round(tasaDiaria * 15 * 1.08)
      const cobertura = tasaDiaria > 0 ? +(stockActual / tasaDiaria).toFixed(1) : 99.0

      let estado = 'OPTIMO'
      if (diasVenc !== null && diasVenc <= 45 && cobertura > 20) {
        estado = 'RIESGO_VENCIMIENTO'
      } else if (cobertura <= 5 || stockActual <= prod.stock_minimo * 0.7) {
        estado = 'CRITICO'
      } else if (cobertura <= 15 || stockActual < demanda15d) {
        estado = 'ALERTA_REORDEN'
      }

      const deficit = Math.max(0, demanda15d + prod.stock_minimo - stockActual)
      const cajas =
        estado === 'RIESGO_VENCIMIENTO' || estado === 'OPTIMO'
          ? 0
          : Math.max(1, Math.ceil(deficit / Number(prod.unidades_por_caja || 1)))
      const unidadesSugeridas = cajas * Number(prod.unidades_por_caja || 1)
      const costoUnit = Number(prod._costo_unitario || 0.15)
      const inversion = +(unidadesSugeridas * costoUnit).toFixed(2)

      return {
        producto_id: prod.id,
        codigo_barras: prod.codigo_barras,
        nombre: prod.nombre,
        laboratorio: prod.laboratorio,
        unidades_por_caja: prod.unidades_por_caja,
        stock_actual_unidades: stockActual,
        stock_minimo_unidades: prod.stock_minimo,
        ventas_ultimos_7d: v7,
        ventas_ultimos_14d: v14,
        ventas_ultimos_30d: v30,
        dias_para_vencimiento_fefo: diasVenc,
        proximo_vencimiento_fefo: primero ? primero.fecha_vencimiento : null,
        demanda_predicha_15d: demanda15d,
        dias_cobertura_actual: cobertura,
        estado_rotacion: estado,
        cantidad_unidades_sugerida: unidadesSugeridas,
        cajas_sugeridas_compra: cajas,
        inversion_estimada: inversion,
      }
    })

    const ordenPrioridad = {
      CRITICO: 1,
      ALERTA_REORDEN: 2,
      RIESGO_VENCIMIENTO: 3,
      OPTIMO: 4,
    }
    sugerencias.sort(
      (a, b) => ordenPrioridad[a.estado_rotacion] - ordenPrioridad[b.estado_rotacion]
    )

    const filtradas = soloCriticos
      ? sugerencias.filter((s) => s.estado_rotacion !== 'OPTIMO')
      : sugerencias

    const criticosCount = sugerencias.filter((s) => s.estado_rotacion !== 'OPTIMO').length
    const inversionTotal = filtradas.reduce((acc, s) => acc + s.inversion_estimada, 0)

    return {
      fecha_generacion: new Date().toISOString(),
      horizonte_dias: 15,
      modelo_utilizado: 'LightGBM Regressor (lags t-7, t-14, t-30)',
      total_skus_analizados: sugerencias.length,
      total_skus_criticos: criticosCount,
      inversion_total_sugerida: +inversionTotal.toFixed(2),
      sugerencias: filtradas,
    }
  },

  generarCsvOrdenCompraMl: (soloCriticos = false) => {
    const reporte = localDemoStore.obtenerSugerenciasReorden(soloCriticos)
    const encabezados = [
      'CODIGO_BARRAS',
      'MEDICAMENTO',
      'LABORATORIO',
      'ESTADO_ROTACION_ML',
      'STOCK_ACTUAL_UNIDADES',
      'STOCK_MINIMO',
      'DEMANDA_PREDICHA_15_DIAS',
      'DIAS_COBERTURA_ACTUAL',
      'CAJAS_SUGERIDAS_A_PEDIR',
      'UNIDADES_SUGERIDAS_A_PEDIR',
      'INVERSION_ESTIMADA_PEN',
      'PROXIMO_VENCIMIENTO_FEFO',
    ]
    const filas = reporte.sugerencias.map((s) =>
      [
        s.codigo_barras,
        `"${String(s.nombre || '').replace(/"/g, '""')}"`,
        `"${String(s.laboratorio || '-').replace(/"/g, '""')}"`,
        s.estado_rotacion,
        s.stock_actual_unidades,
        s.stock_minimo_unidades,
        s.demanda_predicha_15d,
        s.dias_cobertura_actual,
        s.cajas_sugeridas_compra,
        s.cantidad_unidades_sugerida,
        Number(s.inversion_estimada || 0).toFixed(2),
        s.proximo_vencimiento_fefo || '-',
      ].join(';')
    )
    return '\ufeff' + [encabezados.join(';'), ...filas].join('\r\n')
  },
}
