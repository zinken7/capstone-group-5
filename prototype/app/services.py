from __future__ import annotations

from datetime import datetime, timezone
from math import ceil

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import (
    CaseStudy,
    EquipmentInstance,
    EquipmentModel,
    EquipmentType,
    EvidenceSource,
    Location,
    LocationType,
    Organisation,
    OrganisationType,
    VerificationStatus,
)
from app.schemas import PaginatedEquipment, SubmissionCreate


def _get_or_create_org(
    db: Session, name: str | None, organisation_type: OrganisationType
) -> Organisation | None:
    if not name:
        return None
    normalized = " ".join(name.split())
    org = db.scalar(select(Organisation).where(func.lower(Organisation.name) == normalized.lower()))
    if org:
        return org
    org = Organisation(name=normalized, organisation_type=organisation_type)
    db.add(org)
    db.flush()
    return org


def _get_or_create_location(
    db: Session,
    *,
    name: str,
    location_type: LocationType,
    country_code: str,
    parent: Location | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Location:
    stmt = select(Location).where(
        func.lower(Location.name) == name.strip().lower(),
        Location.parent_id == (parent.id if parent else None),
    )
    location = db.scalar(stmt)
    if location:
        if latitude is not None:
            location.latitude = latitude
        if longitude is not None:
            location.longitude = longitude
        return location
    location = Location(
        name=" ".join(name.split()),
        location_type=location_type,
        country_code=country_code,
        parent=parent,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(location)
    db.flush()
    return location


def create_submission(db: Session, payload: SubmissionCreate) -> EquipmentInstance:
    manufacturer = _get_or_create_org(db, payload.manufacturer_name, OrganisationType.manufacturer)
    owner = _get_or_create_org(db, payload.owner_name, OrganisationType.owner)
    integrator = _get_or_create_org(db, payload.integrator_name, OrganisationType.integrator)

    model = db.scalar(
        select(EquipmentModel).where(
            EquipmentModel.manufacturer_id == manufacturer.id,
            func.lower(EquipmentModel.model_name) == payload.model_name.strip().lower(),
        )
    )
    if not model:
        model = EquipmentModel(
            manufacturer=manufacturer,
            model_name=" ".join(payload.model_name.split()),
            equipment_type=payload.equipment_type,
            max_payload_tonnes=payload.max_payload_tonnes,
            operating_weight_tonnes=payload.operating_weight_tonnes,
        )
        db.add(model)
        db.flush()

    parent = None
    if payload.region_name:
        parent = _get_or_create_location(
            db,
            name=payload.region_name,
            location_type=LocationType.region,
            country_code=payload.country_code,
        )
    if payload.parent_operation_name:
        parent = _get_or_create_location(
            db,
            name=payload.parent_operation_name,
            location_type=LocationType.operation,
            country_code=payload.country_code,
            parent=parent,
        )
    mine_site = _get_or_create_location(
        db,
        name=payload.mine_site_name,
        location_type=LocationType.mine_site,
        country_code=payload.country_code,
        parent=parent,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    instance = EquipmentInstance(
        asset_name=payload.asset_name.strip(),
        model=model,
        location=mine_site,
        owner=owner,
        integrator=integrator,
        quantity=payload.quantity,
        commissioning_date=payload.commissioning_date,
        asset_status=payload.asset_status,
        autonomy_level=payload.autonomy_level,
        notes=payload.notes,
        submitted_by_name=payload.submitted_by_name.strip(),
        submitted_by_email=str(payload.submitted_by_email),
        verification_status=VerificationStatus.pending,
    )
    db.add(instance)
    db.flush()

    for source in payload.evidence:
        db.add(
            EvidenceSource(
                equipment=instance,
                title=source.title,
                url=str(source.url),
                evidence_type=source.evidence_type,
                publisher=source.publisher,
                published_date=source.published_date,
            )
        )
    for case in payload.case_studies:
        db.add(
            CaseStudy(
                equipment=instance,
                organisation=owner,
                location=mine_site,
                title=case.title,
                summary=case.summary,
                url=str(case.url),
                media_type=case.media_type,
            )
        )

    db.commit()
    db.refresh(instance)
    return instance


def equipment_to_summary(item: EquipmentInstance) -> dict:
    return {
        "id": item.id,
        "asset_name": item.asset_name,
        "equipment_type": item.model.equipment_type.value,
        "manufacturer": item.model.manufacturer.name,
        "model_name": item.model.model_name,
        "mine_site": item.location.name,
        "country_code": item.location.country_code,
        "latitude": item.location.latitude,
        "longitude": item.location.longitude,
        "owner": item.owner.name if item.owner else None,
        "integrator": item.integrator.name if item.integrator else None,
        "quantity": item.quantity,
        "commissioning_date": item.commissioning_date,
        "asset_status": item.asset_status.value,
        "verification_status": item.verification_status,
        "evidence_count": len(item.evidence),
        "created_at": item.created_at,
    }


def list_equipment(
    db: Session,
    *,
    q: str | None,
    equipment_type: EquipmentType | None,
    manufacturer: str | None,
    country: str | None,
    verification_status: VerificationStatus | None,
    page: int,
    page_size: int,
) -> PaginatedEquipment:
    filters = []
    if q:
        term = f"%{q.strip()}%"
        filters.append(
            or_(
                EquipmentInstance.asset_name.ilike(term),
                EquipmentModel.model_name.ilike(term),
                Organisation.name.ilike(term),
                Location.name.ilike(term),
            )
        )
    if equipment_type:
        filters.append(EquipmentModel.equipment_type == equipment_type)
    if manufacturer:
        filters.append(Organisation.name.ilike(f"%{manufacturer.strip()}%"))
    if country:
        filters.append(Location.country_code == country.upper())
    if verification_status:
        filters.append(EquipmentInstance.verification_status == verification_status)

    base = (
        select(EquipmentInstance)
        .join(EquipmentInstance.model)
        .join(EquipmentModel.manufacturer)
        .join(EquipmentInstance.location)
        .where(*filters)
    )
    count_stmt = select(func.count()).select_from(base.subquery())
    total = db.scalar(count_stmt) or 0
    stmt = (
        base.options(
            joinedload(EquipmentInstance.model).joinedload(EquipmentModel.manufacturer),
            joinedload(EquipmentInstance.location),
            joinedload(EquipmentInstance.owner),
            joinedload(EquipmentInstance.integrator),
            selectinload(EquipmentInstance.evidence),
        )
        .order_by(EquipmentInstance.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(stmt).unique().all()
    return PaginatedEquipment(
        items=[equipment_to_summary(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        pages=ceil(total / page_size) if total else 0,
    )


def get_equipment(db: Session, equipment_id: int) -> EquipmentInstance | None:
    stmt = (
        select(EquipmentInstance)
        .where(EquipmentInstance.id == equipment_id)
        .options(
            joinedload(EquipmentInstance.model).joinedload(EquipmentModel.manufacturer),
            joinedload(EquipmentInstance.location).joinedload(Location.parent),
            joinedload(EquipmentInstance.owner),
            joinedload(EquipmentInstance.integrator),
            selectinload(EquipmentInstance.evidence),
            selectinload(EquipmentInstance.case_studies),
        )
    )
    return db.scalar(stmt)


def review_submission(
    db: Session, equipment_id: int, status: VerificationStatus, notes: str | None
) -> EquipmentInstance | None:
    item = get_equipment(db, equipment_id)
    if not item:
        return None
    if status == VerificationStatus.verified and not item.evidence:
        raise ValueError("A submission cannot be verified without evidence.")
    item.verification_status = status
    item.review_notes = notes
    item.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item
