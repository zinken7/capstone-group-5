from math import radians, sin, cos, sqrt, atan2

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import engine, get_db
from app.models import (
    EquipmentInstance,
    EquipmentModel,
    EquipmentType,
    Location,
    Organisation,
    VerificationStatus,
)
from app.schemas import PaginatedEquipment, ReviewRequest, SubmissionCreate
from app.services import (
    create_submission,
    equipment_to_summary,
    get_equipment,
    list_equipment,
    review_submission,
)

router = APIRouter(prefix="/api")
settings = get_settings()


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return earth_radius_km * 2 * atan2(sqrt(a), sqrt(1 - a))


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "environment": settings.environment}


@router.get("/equipment", response_model=PaginatedEquipment)
def equipment_list(
    q: str | None = None,
    equipment_type: EquipmentType | None = None,
    manufacturer: str | None = None,
    country: str | None = Query(default=None, min_length=2, max_length=2),
    verification_status: VerificationStatus | None = VerificationStatus.verified,
    include_all: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_equipment(
        db,
        q=q,
        equipment_type=equipment_type,
        manufacturer=manufacturer,
        country=country,
        verification_status=None if include_all else verification_status,
        page=page,
        page_size=page_size,
    )


@router.get("/equipment/{equipment_id}")
def equipment_detail(equipment_id: int, db: Session = Depends(get_db)):
    item = get_equipment(db, equipment_id)
    if not item:
        raise HTTPException(status_code=404, detail="Equipment record not found")
    summary = equipment_to_summary(item)
    summary.update(
        {
            "max_payload_tonnes": item.model.max_payload_tonnes,
            "operating_weight_tonnes": item.model.operating_weight_tonnes,
            "autonomy_level": item.autonomy_level,
            "notes": item.notes,
            "review_notes": item.review_notes,
            "location_hierarchy": _location_hierarchy(item.location),
            "evidence": [
                {
                    "id": e.id,
                    "title": e.title,
                    "url": e.url,
                    "evidence_type": e.evidence_type.value,
                    "publisher": e.publisher,
                    "published_date": e.published_date,
                }
                for e in item.evidence
            ],
            "case_studies": [
                {
                    "id": c.id,
                    "title": c.title,
                    "summary": c.summary,
                    "url": c.url,
                    "media_type": c.media_type,
                }
                for c in item.case_studies
            ],
        }
    )
    return summary


def _location_hierarchy(location: Location) -> list[dict]:
    nodes = []
    current = location
    while current:
        nodes.append({"id": current.id, "name": current.name, "type": current.location_type.value})
        current = current.parent
    return list(reversed(nodes))


@router.get("/map")
def map_geojson(
    verification_status: VerificationStatus | None = VerificationStatus.verified,
    include_all: bool = False,
    equipment_type: EquipmentType | None = None,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lon: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0, le=5000),
    db: Session = Depends(get_db),
):
    stmt = (
        select(EquipmentInstance)
        .join(EquipmentInstance.model)
        .join(EquipmentInstance.location)
        .options(
            joinedload(EquipmentInstance.model).joinedload(EquipmentModel.manufacturer),
            joinedload(EquipmentInstance.location),
            joinedload(EquipmentInstance.owner),
            joinedload(EquipmentInstance.integrator),
        )
        .where(Location.latitude.is_not(None), Location.longitude.is_not(None))
    )
    if verification_status and not include_all:
        stmt = stmt.where(EquipmentInstance.verification_status == verification_status)
    if equipment_type:
        stmt = stmt.where(EquipmentModel.equipment_type == equipment_type)
    use_python_radius = lat is not None and lon is not None and radius_km is not None
    if use_python_radius and engine.dialect.name == "postgresql":
        nearby_location_ids = db.scalars(
            text(
                """
                SELECT id FROM locations
                WHERE geom IS NOT NULL
                  AND ST_DWithin(
                    geom,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    :radius_metres
                  )
                """
            ),
            {"lat": lat, "lon": lon, "radius_metres": radius_km * 1000},
        ).all()
        stmt = stmt.where(Location.id.in_(nearby_location_ids))
        use_python_radius = False

    items = db.scalars(stmt).unique().all()

    features = []
    for item in items:
        if use_python_radius:
            distance = _haversine_km(lat, lon, item.location.latitude, item.location.longitude)
            if distance > radius_km:
                continue
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [item.location.longitude, item.location.latitude],
                },
                "properties": equipment_to_summary(item),
            }
        )
    return {"type": "FeatureCollection", "features": features}


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    verified_filter = EquipmentInstance.verification_status == VerificationStatus.verified
    total_records = db.scalar(select(func.count(EquipmentInstance.id)).where(verified_filter)) or 0
    total_assets = db.scalar(select(func.coalesce(func.sum(EquipmentInstance.quantity), 0)).where(verified_filter)) or 0
    total_sites = (
        db.scalar(select(func.count(func.distinct(EquipmentInstance.location_id))).where(verified_filter)) or 0
    )
    countries = (
        db.scalar(
            select(func.count(func.distinct(Location.country_code)))
            .select_from(EquipmentInstance)
            .join(EquipmentInstance.location)
            .where(verified_filter)
        )
        or 0
    )

    by_type_rows = db.execute(
        select(EquipmentModel.equipment_type, func.sum(EquipmentInstance.quantity))
        .join(EquipmentInstance, EquipmentInstance.model_id == EquipmentModel.id)
        .where(verified_filter)
        .group_by(EquipmentModel.equipment_type)
        .order_by(func.sum(EquipmentInstance.quantity).desc())
    ).all()
    by_manufacturer_rows = db.execute(
        select(Organisation.name, func.sum(EquipmentInstance.quantity))
        .join(EquipmentModel, EquipmentModel.manufacturer_id == Organisation.id)
        .join(EquipmentInstance, EquipmentInstance.model_id == EquipmentModel.id)
        .where(verified_filter)
        .group_by(Organisation.name)
        .order_by(func.sum(EquipmentInstance.quantity).desc())
        .limit(10)
    ).all()
    timeline_rows = db.execute(
        select(
            func.extract("year", EquipmentInstance.commissioning_date).label("year"),
            func.sum(EquipmentInstance.quantity),
        )
        .where(verified_filter, EquipmentInstance.commissioning_date.is_not(None))
        .group_by("year")
        .order_by("year")
    ).all()

    return {
        "totals": {
            "records": total_records,
            "assets": int(total_assets),
            "mine_sites": total_sites,
            "countries": countries,
        },
        "by_type": [{"label": row[0].value, "value": int(row[1])} for row in by_type_rows],
        "by_manufacturer": [{"label": row[0], "value": int(row[1])} for row in by_manufacturer_rows],
        "timeline": [{"label": str(int(row[0])), "value": int(row[1])} for row in timeline_rows],
    }


@router.get("/reference-data")
def reference_data(db: Session = Depends(get_db)):
    manufacturers = db.scalars(
        select(Organisation.name)
        .join(EquipmentModel, EquipmentModel.manufacturer_id == Organisation.id)
        .distinct()
        .order_by(Organisation.name)
    ).all()
    countries = db.scalars(select(Location.country_code).distinct().order_by(Location.country_code)).all()
    return {
        "equipment_types": [e.value for e in EquipmentType],
        "manufacturers": manufacturers,
        "countries": countries,
        "verification_statuses": [v.value for v in VerificationStatus],
    }


@router.post("/submissions", status_code=201)
def submit_equipment(payload: SubmissionCreate, db: Session = Depends(get_db)):
    item = create_submission(db, payload)
    return {
        "id": item.id,
        "status": item.verification_status.value,
        "message": "Submission received and queued for verification.",
    }


@router.get("/admin/submissions", dependencies=[Depends(require_admin)])
def admin_submissions(
    verification_status: VerificationStatus = VerificationStatus.pending,
    db: Session = Depends(get_db),
):
    result = list_equipment(
        db,
        q=None,
        equipment_type=None,
        manufacturer=None,
        country=None,
        verification_status=verification_status,
        page=1,
        page_size=100,
    )
    return result


@router.post("/admin/submissions/{equipment_id}/approve", dependencies=[Depends(require_admin)])
def approve_submission(
    equipment_id: int, payload: ReviewRequest, db: Session = Depends(get_db)
):
    try:
        item = review_submission(db, equipment_id, VerificationStatus.verified, payload.notes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"id": item.id, "status": item.verification_status.value}


@router.post("/admin/submissions/{equipment_id}/reject", dependencies=[Depends(require_admin)])
def reject_submission(
    equipment_id: int, payload: ReviewRequest, db: Session = Depends(get_db)
):
    item = review_submission(db, equipment_id, VerificationStatus.rejected, payload.notes)
    if not item:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"id": item.id, "status": item.verification_status.value}
