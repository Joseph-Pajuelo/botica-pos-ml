from fastapi import APIRouter

from app.api.v1.inventario import router as inventario_router
from app.api.v1.pos import router as pos_router
from app.api.v1.productos import router as productos_router

api_router = APIRouter()
api_router.include_router(productos_router)
api_router.include_router(inventario_router)
api_router.include_router(pos_router)
