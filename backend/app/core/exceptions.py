class BoticaDomainError(Exception):
    """Excepción base para reglas de negocio farmacéutico."""

    def __init__(self, mensaje: str, codigo_http: int = 400) -> None:
        self.mensaje = mensaje
        self.codigo_http = codigo_http
        super().__init__(mensaje)


class ProductoNoEncontradoError(BoticaDomainError):
    def __init__(self, identificador: str | int) -> None:
        super().__init__(
            f"No se encontró el producto con identificador '{identificador}'.",
            codigo_http=404,
        )


class LoteNoEncontradoError(BoticaDomainError):
    def __init__(self, lote_id: int) -> None:
        super().__init__(
            f"No se encontró el lote con ID {lote_id}.",
            codigo_http=404,
        )


class LoteVencidoError(BoticaDomainError):
    def __init__(self, mensaje: str) -> None:
        super().__init__(mensaje, codigo_http=400)


class VentaNoEncontradaError(BoticaDomainError):
    def __init__(self, venta_id: int) -> None:
        super().__init__(
            f"No se encontró la venta con ID #{venta_id}.",
            codigo_http=404,
        )


class VentaYaAnuladaError(BoticaDomainError):
    def __init__(self, venta_id: int) -> None:
        super().__init__(
            f"La venta #{venta_id} ya fue anulada previamente.",
            codigo_http=409,
        )


class CodigoBarrasDuplicadoError(BoticaDomainError):
    def __init__(self, codigo_barras: str) -> None:
        super().__init__(
            f"Ya existe un producto registrado con el código de barras '{codigo_barras}'.",
            codigo_http=409,
        )


class LoteDuplicadoError(BoticaDomainError):
    def __init__(self, numero_lote: str) -> None:
        super().__init__(
            f"El número de lote '{numero_lote}' ya está registrado para este producto.",
            codigo_http=409,
        )


class UsuarioDuplicadoError(BoticaDomainError):
    def __init__(self, username: str) -> None:
        super().__init__(
            f"El nombre de usuario '{username}' ya se encuentra registrado.",
            codigo_http=409,
        )


class CredencialesInvalidasError(BoticaDomainError):
    def __init__(self, mensaje: str = "Usuario o contraseña incorrectos.") -> None:
        super().__init__(mensaje, codigo_http=401)


class PresentacionNoPermitidaError(BoticaDomainError):
    def __init__(self, mensaje: str) -> None:
        super().__init__(mensaje, codigo_http=400)


class StockInsuficienteError(BoticaDomainError):
    def __init__(self, nombre_producto: str, solicitado: int, disponible: int) -> None:
        super().__init__(
            f"Stock vigente insuficiente para '{nombre_producto}': "
            f"se requieren {solicitado} unidades mínimas, pero solo hay {disponible} disponibles (FEFO).",
            codigo_http=409,
        )
