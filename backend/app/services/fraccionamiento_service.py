from dataclasses import dataclass
from decimal import Decimal

from app.core.exceptions import PresentacionNoPermitidaError
from app.models.enums import TipoPresentacion
from app.models.producto import Producto


@dataclass(frozen=True)
class CalculoFraccionamiento:
    """Resultado inmutable de la conversión de presentación a unidades mínimas."""

    unidades_minimas: int
    precio_unitario_presentacion: Decimal
    subtotal: Decimal


class FraccionamientoService:
    """
    Servicio de dominio puro (SOLID: SRP) encargado de convertir presentaciones
    (Caja, Blíster, Unidad) a la unidad mínima de control del Kardex.
    """

    @staticmethod
    def calcular(
        producto: Producto,
        tipo_presentacion: TipoPresentacion,
        cantidad_presentacion: int,
    ) -> CalculoFraccionamiento:
        if cantidad_presentacion <= 0:
            raise PresentacionNoPermitidaError(
                "La cantidad solicitada debe ser mayor a cero."
            )

        if tipo_presentacion == TipoPresentacion.CAJA:
            unidades_minimas = cantidad_presentacion * producto.unidades_por_caja
            precio = producto.precio_venta_caja
            return CalculoFraccionamiento(
                unidades_minimas=unidades_minimas,
                precio_unitario_presentacion=precio,
                subtotal=precio * Decimal(cantidad_presentacion),
            )

        if not producto.fraccionable:
            raise PresentacionNoPermitidaError(
                f"El producto '{producto.nombre}' no es fraccionable y solo puede venderse por CAJA."
            )

        if tipo_presentacion == TipoPresentacion.BLISTER:
            if not producto.unidades_por_blister or not producto.precio_venta_blister:
                raise PresentacionNoPermitidaError(
                    f"El producto '{producto.nombre}' no tiene configurado factor o precio de blíster."
                )
            unidades_minimas = cantidad_presentacion * producto.unidades_por_blister
            precio = producto.precio_venta_blister
            return CalculoFraccionamiento(
                unidades_minimas=unidades_minimas,
                precio_unitario_presentacion=precio,
                subtotal=precio * Decimal(cantidad_presentacion),
            )

        if tipo_presentacion == TipoPresentacion.UNIDAD:
            if not producto.precio_venta_unitario:
                raise PresentacionNoPermitidaError(
                    f"El producto '{producto.nombre}' no tiene configurado precio por unidad suelta."
                )
            unidades_minimas = cantidad_presentacion
            precio = producto.precio_venta_unitario
            return CalculoFraccionamiento(
                unidades_minimas=unidades_minimas,
                precio_unitario_presentacion=precio,
                subtotal=precio * Decimal(cantidad_presentacion),
            )

        raise PresentacionNoPermitidaError(
            f"Tipo de presentación no soportado: {tipo_presentacion}"
        )
