from fastapi import APIRouter, Body
from ..models.schemas import SimulationSettings
from ..core.database import save_persisted_settings

def create_settings_router(sim_engine):
    router = APIRouter(prefix="/api/settings", tags=["Settings"])

    @router.get("", response_model=SimulationSettings)
    def get_settings():
        return sim_engine.settings

    @router.put("", response_model=SimulationSettings)
    def update_settings(new_settings: SimulationSettings):
        sim_engine.settings = new_settings
        # Persist to database
        save_persisted_settings(new_settings.dict())
        return sim_engine.settings

    return router
