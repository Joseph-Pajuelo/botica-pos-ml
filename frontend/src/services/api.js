import axios from 'axios'
import { localDemoStore } from './localDemoStore'

export const AUTH_TOKEN_KEY = 'botica_access_token'
export const AUTH_USER_KEY = 'botica_usuario'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 4000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Adjunta el token JWT en cada petición al Backend
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // ignore storage errors
  }
  return config
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
// 0. SEGURIDAD Y AUTENTICACIÓN JWT
// ============================================================================
export const authApi = {
  getStoredToken: () => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY)
    } catch {
      return null
    }
  },

  getStoredUser: () => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  saveSession: (tokenResponse) => {
    try {
      if (tokenResponse?.access_token) {
        localStorage.setItem(AUTH_TOKEN_KEY, tokenResponse.access_token)
      }
      if (tokenResponse?.usuario) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(tokenResponse.usuario))
      }
    } catch {
      // ignore storage errors
    }
  },

  logout: () => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
    } catch {
      // ignore storage errors
    }
  },

  login: async ({ username, password }) => {
    try {
      const { data } = await api.post('/auth/login', {
        username: String(username || '').trim(),
        password: String(password || ''),
      })
      authApi.saveSession(data)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        const demoRes = localDemoStore.autenticar({ username, password })
        authApi.saveSession(demoRes)
        return demoRes
      }
      throw err
    }
  },

  me: async () => {
    try {
      const { data } = await api.get('/auth/me')
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return authApi.getStoredUser()
      }
      throw err
    }
  },
}

// ============================================================================
// 1. PRODUCTOS, SUSTITUTOS Y LECTOR DE CÓDIGO DE BARRAS USB (HID)
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

  buscarSustitutos: async (productoId) => {
    try {
      const { data } = await api.get(`/productos/${productoId}/sustitutos`)
      return data
    } catch (err) {
      if (isNetworkOffline(err)) {
        return localDemoStore.buscarSustitutos(productoId)
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

// ============================================================================
// 5. REPORTES GERENCIALES Y EXPORTACIÓN EXCEL (CSV CON BOM UTF-8)
// ============================================================================
export const reportesApi = {
  descargarOrdenCompraExcel: async (soloCriticos = false) => {
    let csvContent = ''
    try {
      const response = await api.get('/reportes/exportar/orden-compra-ml.csv', {
        params: { solo_criticos: soloCriticos },
        responseType: 'text',
      })
      csvContent = response.data
    } catch (err) {
      if (isNetworkOffline(err)) {
        csvContent = localDemoStore.generarCsvOrdenCompraMl(soloCriticos)
      } else {
        throw err
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'orden_compra_sugerida_ml.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    return true
  },
}

export default api
