import axios from 'axios'
import { localDemoStore } from './localDemoStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 4000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function isNetworkOffline(error) {
  return (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    !error?.response
  )
}

/**
 * Extrae un mensaje de error legible desde respuestas FastAPI / Axios.
 */
export function getErrorMessage(error) {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((d) => `${d.loc?.slice(-1)?.[0] || 'Campo'}: ${d.msg}`).join(', ')
    }
  }
  return error?.message || 'Ocurrió un error inesperado.'
}

// ============================================================================
// 1. PRODUCTOS Y LECTOR DE CÓDIGO DE BARRAS USB (HID)
// ============================================================================
export const productosApi = {
  listar: async ({ buscar = '', skip = 0, limit = 100 } = {}) => {
    try {
      const params = { skip, limit }
      if (buscar && buscar.trim() !== '') {
        params.buscar = buscar.trim()
      }
      const { data } = await api.get('/productos', { params })
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.listarProductos({ buscar })
      }
      throw err
    }
  },

  escanearBarcode: async (codigoBarras) => {
    const t0 = performance.now()
    try {
      const { data } = await api.get(
        `/productos/barcode/${encodeURIComponent(codigoBarras.trim())}`
      )
      const latencyMs = Math.round(performance.now() - t0)
      return { producto: data, latencyMs }
    } catch (err) {
      if (isNetworkOffline(err)) {
        const producto = localDemoStore.escanearBarcode(codigoBarras)
        const latencyMs = Math.max(4, Math.round(performance.now() - t0))
        return { producto, latencyMs }
      }
      throw err
    }
  },

  crear: async (payload) => {
    try {
      const { data } = await api.post('/productos', payload)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.crearProducto(payload)
      }
      throw err
    }
  },

  actualizar: async (productoId, payload) => {
    try {
      const { data } = await api.patch(`/productos/${productoId}`, payload)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.actualizarProducto(productoId, payload)
      }
      throw err
    }
  },
}

// ============================================================================
// 2. PUNTO DE VENTA (POS) BAJO ESTÁNDAR FEFO
// ============================================================================
export const posApi = {
  registrarVenta: async (payload) => {
    try {
      const { data } = await api.post('/pos/ventas', payload)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.registrarVenta(payload)
      }
      throw err
    }
  },

  listarVentas: async ({ skip = 0, limit = 30 } = {}) => {
    try {
      const { data } = await api.get('/pos/ventas', { params: { skip, limit } })
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.listarVentas()
      }
      throw err
    }
  },

  obtenerVenta: async (ventaId) => {
    try {
      const { data } = await api.get(`/pos/ventas/${ventaId}`)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.obtenerVenta(ventaId)
      }
      throw err
    }
  },
}

// ============================================================================
// 3. INVENTARIO, LOTES FEFO, MERMAS Y KARDEX INMUTABLE
// ============================================================================
export const inventarioApi = {
  registrarLote: async (payload) => {
    try {
      const { data } = await api.post('/inventario/lotes', payload)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.registrarLote(payload)
      }
      throw err
    }
  },

  listarLotesProducto: async (productoId) => {
    try {
      const { data } = await api.get(`/inventario/lotes/producto/${productoId}`)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.listarLotesProducto(productoId)
      }
      throw err
    }
  },

  obtenerAlertasVencimiento: async (dias = 60) => {
    try {
      const { data } = await api.get('/inventario/alertas-vencimiento', {
        params: { dias },
      })
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.obtenerAlertasVencimiento(dias)
      }
      throw err
    }
  },

  registrarAjuste: async (payload) => {
    try {
      const { data } = await api.post('/inventario/ajustes', payload)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.registrarAjuste(payload)
      }
      throw err
    }
  },

  consultarKardexLote: async (loteId) => {
    try {
      const { data } = await api.get(`/inventario/kardex/lote/${loteId}`)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.consultarKardexLote(loteId)
      }
      throw err
    }
  },
}

// ============================================================================
// 4. MOTOR DE MACHINE LEARNING Y SEEDING COLD-START
// ============================================================================
export const mlApi = {
  obtenerSugerenciasReorden: async (soloCriticos = false) => {
    try {
      const { data } = await api.get('/ml/reorder-suggestions', {
        params: { solo_criticos: soloCriticos },
      })
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.obtenerSugerenciasReorden(soloCriticos)
      }
      throw err
    }
  },

  seedColdStart: async (mesesHistoria = 12) => {
    try {
      const { data } = await api.post('/ml/seed-cold-start', null, {
        params: { meses_historia: mesesHistoria },
      })
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.resetSeed(mesesHistoria)
      }
      throw err
    }
  },
}

export default api
