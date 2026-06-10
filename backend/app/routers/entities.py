from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import EntitySummary
from ..schemas import EntitySummaryPublic

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("/{canonical_name}", response_model=EntitySummaryPublic)
async def fetch_entity_summary(canonical_name: str, session: AsyncSession = Depends(get_session)) -> EntitySummaryPublic:
    entity = await session.scalar(select(EntitySummary).where(EntitySummary.canonical_name == canonical_name))
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity summary not found")
    return EntitySummaryPublic.model_validate(entity, from_attributes=True)
