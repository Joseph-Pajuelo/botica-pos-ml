from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.inventario import router as inventario_router
from app.api.v1.ml import router as ml_router
from app.api.v1.pos import router as pos_router
from app.api.v1.productos import router as productos_router
from app.api.v1.reportes import router as reportes_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(productos_router)
api_router.include_router(inventario_router)
api_router.include_router(pos_router)
api_router.include_router(ml_router)
api_router.include_router(reportes_router)
