from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrganisationType(str, enum.Enum):
    owner = "owner"
    manufacturer = "manufacturer"
    integrator = "integrator"
    operator = "operator"
    other = "other"


class LocationType(str, enum.Enum):
    country = "country"
    region = "region"
    operation = "operation"
    mine_site = "mine_site"


class EquipmentType(str, enum.Enum):
    truck = "Truck"
    dozer = "Dozer"
    loader = "Loader"
    drill = "Drill"
    excavator = "Excavator"
    other = "Other"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class AssetStatus(str, enum.Enum):
    active = "active"
    pilot = "pilot"
    retired = "retired"
    unknown = "unknown"


class EvidenceType(str, enum.Enum):
    press_release = "press_release"
    news = "news"
    academic = "academic"
    company_report = "company_report"
    government = "government"
    other = "other"


class Organisation(Base):
    __tablename__ = "organisations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    organisation_type: Mapped[OrganisationType] = mapped_column(Enum(OrganisationType), index=True)
    website: Mapped[str | None] = mapped_column(String(500))
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    location_type: Mapped[LocationType] = mapped_column(Enum(LocationType), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id", ondelete="SET NULL"))
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

    parent: Mapped[Location | None] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[list[Location]] = relationship(back_populates="parent")

    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="uq_location_name_parent"),
        Index("ix_locations_lat_lon", "latitude", "longitude"),
    )


class EquipmentModel(Base):
    __tablename__ = "equipment_models"

    id: Mapped[int] = mapped_column(primary_key=True)
    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("organisations.id", ondelete="RESTRICT"))
    model_name: Mapped[str] = mapped_column(String(150), index=True)
    equipment_type: Mapped[EquipmentType] = mapped_column(Enum(EquipmentType), index=True)
    max_payload_tonnes: Mapped[float | None] = mapped_column(Float)
    operating_weight_tonnes: Mapped[float | None] = mapped_column(Float)
    specifications: Mapped[dict] = mapped_column(JSON, default=dict)

    manufacturer: Mapped[Organisation] = relationship()

    __table_args__ = (
        UniqueConstraint("manufacturer_id", "model_name", name="uq_manufacturer_model"),
    )


class EquipmentInstance(Base):
    __tablename__ = "equipment_instances"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_name: Mapped[str] = mapped_column(String(200), index=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("equipment_models.id", ondelete="RESTRICT"))
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"))
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("organisations.id", ondelete="SET NULL"))
    integrator_id: Mapped[int | None] = mapped_column(ForeignKey("organisations.id", ondelete="SET NULL"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    commissioning_date: Mapped[date | None] = mapped_column(Date)
    asset_status: Mapped[AssetStatus] = mapped_column(Enum(AssetStatus), default=AssetStatus.unknown)
    autonomy_level: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), default=VerificationStatus.pending, index=True
    )
    submitted_by_name: Mapped[str] = mapped_column(String(150))
    submitted_by_email: Mapped[str] = mapped_column(String(320))
    review_notes: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    model: Mapped[EquipmentModel] = relationship()
    location: Mapped[Location] = relationship()
    owner: Mapped[Organisation | None] = relationship(foreign_keys=[owner_id])
    integrator: Mapped[Organisation | None] = relationship(foreign_keys=[integrator_id])
    evidence: Mapped[list[EvidenceSource]] = relationship(
        back_populates="equipment", cascade="all, delete-orphan"
    )
    case_studies: Mapped[list[CaseStudy]] = relationship(
        back_populates="equipment", cascade="all, delete-orphan"
    )


class EvidenceSource(Base):
    __tablename__ = "evidence_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("equipment_instances.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    url: Mapped[str] = mapped_column(String(1000))
    evidence_type: Mapped[EvidenceType] = mapped_column(Enum(EvidenceType))
    publisher: Mapped[str | None] = mapped_column(String(200))
    published_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    equipment: Mapped[EquipmentInstance] = relationship(back_populates="evidence")


class CaseStudy(Base):
    __tablename__ = "case_studies"

    id: Mapped[int] = mapped_column(primary_key=True)
    equipment_id: Mapped[int | None] = mapped_column(
        ForeignKey("equipment_instances.id", ondelete="CASCADE"), index=True
    )
    organisation_id: Mapped[int | None] = mapped_column(
        ForeignKey("organisations.id", ondelete="SET NULL"), index=True
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(1000))
    media_type: Mapped[str] = mapped_column(String(50), default="case_study")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    equipment: Mapped[EquipmentInstance | None] = relationship(back_populates="case_studies")
    organisation: Mapped[Organisation | None] = relationship()
    location: Mapped[Location | None] = relationship()
