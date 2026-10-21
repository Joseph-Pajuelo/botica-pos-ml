from enum import Enum


class RolUsuario(str, Enum):
    ADMIN = "ADMIN"
    FARMACEUTICO = "FARMACEUTICO"
    CAJERO = "CAJERO"


class MetodoPago(str, Enum):
    EFECTIVO = "EFECTIVO"
    TARJETA = "TARJETA"
    BILLETERA_DIGITAL = "BILLETERA_DIGITAL"


class TipoPresentacion(str, Enum):
    CAJA = "CAJA"
    BLISTER = "BLISTER"
    UNIDAD = "UNIDAD"


class TipoMovimientoKardex(str, Enum):
    VENTA = "VENTA"
    COMPRA = "COMPRA"
    MERMA_VENCIMIENTO = "MERMA_VENCIMIENTO"
    AJUSTE_INVENTARIO = "AJUSTE_INVENTARIO"
