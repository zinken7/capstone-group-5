from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AssetStatus,
    CaseStudy,
    EquipmentInstance,
    EquipmentModel,
    EquipmentType,
    EvidenceSource,
    EvidenceType,
    Location,
    LocationType,
    Organisation,
    OrganisationType,
    VerificationStatus,
)

SEED_REVIEWED_AT = datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc)


def _slug(value: str) -> str:
    return "-".join("".join(char.lower() if char.isalnum() else " " for char in value).split())


def _get_or_create_org(
    db: Session,
    *,
    name: str,
    organisation_type: OrganisationType,
    country: str | None = None,
    website: str | None = None,
) -> Organisation:
    organisation = db.scalar(
        select(Organisation).where(func.lower(Organisation.name) == name.strip().lower())
    )
    if organisation is None:
        organisation = Organisation(
            name=name.strip(),
            organisation_type=organisation_type,
            country=country,
            website=website,
        )
        db.add(organisation)
        db.flush()
        return organisation

    if not organisation.country and country:
        organisation.country = country
    if not organisation.website and website:
        organisation.website = website
    return organisation


def _get_or_create_location(
    db: Session,
    *,
    name: str,
    location_type: LocationType,
    country_code: str,
    parent: Location | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    metadata_json: dict[str, Any] | None = None,
) -> Location:
    location = db.scalar(
        select(Location).where(
            func.lower(Location.name) == name.strip().lower(),
            Location.parent_id == (parent.id if parent else None),
        )
    )
    if location is None:
        location = Location(
            name=name.strip(),
            location_type=location_type,
            country_code=country_code,
            parent=parent,
            latitude=latitude,
            longitude=longitude,
            metadata_json=metadata_json or {},
        )
        db.add(location)
        db.flush()
        return location

    location.location_type = location_type
    location.country_code = country_code
    if latitude is not None:
        location.latitude = latitude
    if longitude is not None:
        location.longitude = longitude
    if metadata_json:
        location.metadata_json = {**(location.metadata_json or {}), **metadata_json}
    return location


def _get_or_create_model(
    db: Session,
    *,
    manufacturer: Organisation,
    model_name: str,
    equipment_type: EquipmentType,
    max_payload_tonnes: float | None,
    operating_weight_tonnes: float | None,
    specifications: dict[str, Any],
) -> EquipmentModel:
    model = db.scalar(
        select(EquipmentModel).where(
            EquipmentModel.manufacturer_id == manufacturer.id,
            func.lower(EquipmentModel.model_name) == model_name.strip().lower(),
        )
    )
    if model is None:
        model = EquipmentModel(
            manufacturer=manufacturer,
            model_name=model_name.strip(),
            equipment_type=equipment_type,
            max_payload_tonnes=max_payload_tonnes,
            operating_weight_tonnes=operating_weight_tonnes,
            specifications=specifications,
        )
        db.add(model)
        db.flush()
        return model

    model.equipment_type = equipment_type
    model.max_payload_tonnes = max_payload_tonnes
    model.operating_weight_tonnes = operating_weight_tonnes
    model.specifications = {**(model.specifications or {}), **specifications}
    return model


def _add_evidence_if_missing(
    db: Session,
    *,
    equipment: EquipmentInstance,
    title: str,
    url: str,
    evidence_type: EvidenceType,
    publisher: str,
    published_date: date,
) -> None:
    exists = db.scalar(
        select(EvidenceSource.id).where(
            EvidenceSource.equipment_id == equipment.id,
            EvidenceSource.url == url,
        )
    )
    if exists is None:
        db.add(
            EvidenceSource(
                equipment=equipment,
                title=title,
                url=url,
                evidence_type=evidence_type,
                publisher=publisher,
                published_date=published_date,
            )
        )


def _add_case_study_if_missing(
    db: Session,
    *,
    equipment: EquipmentInstance,
    organisation: Organisation,
    location: Location,
    title: str,
    summary: str,
    url: str,
    media_type: str,
) -> None:
    exists = db.scalar(
        select(CaseStudy.id).where(
            CaseStudy.equipment_id == equipment.id,
            CaseStudy.url == url,
        )
    )
    if exists is None:
        db.add(
            CaseStudy(
                equipment=equipment,
                organisation=organisation,
                location=location,
                title=title,
                summary=summary,
                url=url,
                media_type=media_type,
            )
        )


MOCK_ASSETS: list[dict[str, Any]] = [
    {
        "asset_name": "Red Ridge Autonomous Haul Fleet",
        "country_code": "AU",
        "region": "Pilbara Demo Region",
        "operation": "Western Demo Operations",
        "site": "Red Ridge Demo Mine",
        "latitude": -22.4202,
        "longitude": 119.7801,
        "owner": "Demo Mining Co",
        "owner_country": "AU",
        "manufacturer": "TerraHaul Systems",
        "manufacturer_country": "AU",
        "integrator": "Autonomy Labs",
        "model": "TH-240A",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 240,
        "operating_weight_tonnes": 165,
        "quantity": 18,
        "commissioning_date": date(2024, 4, 15),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.press_release,
        "media_type": "case_study",
    },
    {
        "asset_name": "Iron Valley Autonomous Drill Pilot",
        "country_code": "AU",
        "region": "Pilbara Demo Region",
        "operation": "Western Demo Operations",
        "site": "Iron Valley Demo Mine",
        "latitude": -23.2901,
        "longitude": 118.6402,
        "owner": "Demo Mining Co",
        "owner_country": "AU",
        "manufacturer": "TerraHaul Systems",
        "manufacturer_country": "AU",
        "integrator": "Autonomy Labs",
        "model": "DR-900 Auto",
        "equipment_type": EquipmentType.drill,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 110,
        "quantity": 3,
        "commissioning_date": date(2025, 2, 1),
        "asset_status": AssetStatus.pilot,
        "autonomy_level": "Supervised autonomous drilling",
        "verification_status": VerificationStatus.pending,
        "evidence_type": EvidenceType.news,
        "media_type": "video",
    },
    {
        "asset_name": "Pilbara North Autonomous Haulage Expansion",
        "country_code": "AU",
        "region": "Pilbara",
        "operation": "North Pilbara Operations",
        "site": "Murchison Ridge Mine",
        "latitude": -22.015,
        "longitude": 118.105,
        "owner": "Southern Cross Resources",
        "owner_country": "AU",
        "manufacturer": "Caterpillar",
        "manufacturer_country": "US",
        "integrator": "Caterpillar MineStar",
        "model": "793F",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 227,
        "operating_weight_tonnes": 164,
        "quantity": 42,
        "commissioning_date": date(2021, 7, 12),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Eastern Range Autonomous Dozer Program",
        "country_code": "AU",
        "region": "Pilbara",
        "operation": "Eastern Range Operations",
        "site": "Blue Mesa Mine",
        "latitude": -23.145,
        "longitude": 119.655,
        "owner": "Red Earth Minerals",
        "owner_country": "AU",
        "manufacturer": "Komatsu",
        "manufacturer_country": "JP",
        "integrator": "Komatsu FrontRunner",
        "model": "D375A-8",
        "equipment_type": EquipmentType.dozer,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 74.7,
        "quantity": 12,
        "commissioning_date": date(2022, 3, 20),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Remote-supervised autonomous dozing",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.press_release,
        "media_type": "video",
    },
    {
        "asset_name": "Goldfields Underground Loader Fleet",
        "country_code": "AU",
        "region": "Goldfields-Esperance",
        "operation": "Central Goldfields Operations",
        "site": "Wattle Creek Underground Mine",
        "latitude": -30.748,
        "longitude": 121.467,
        "owner": "Aurora Gold Holdings",
        "owner_country": "AU",
        "manufacturer": "Sandvik",
        "manufacturer_country": "SE",
        "integrator": "Sandvik AutoMine",
        "model": "LH621i",
        "equipment_type": EquipmentType.loader,
        "max_payload_tonnes": 21,
        "operating_weight_tonnes": 58,
        "quantity": 8,
        "commissioning_date": date(2023, 9, 4),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous underground loading and haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Bowen Basin Autonomous Drill Program",
        "country_code": "AU",
        "region": "Queensland Bowen Basin",
        "operation": "Bowen Basin Operations",
        "site": "Blackwater Plains Mine",
        "latitude": -23.585,
        "longitude": 148.865,
        "owner": "East Coast Coal Ltd",
        "owner_country": "AU",
        "manufacturer": "Epiroc",
        "manufacturer_country": "SE",
        "integrator": "Epiroc Autonomous Solutions",
        "model": "Pit Viper 271 XC",
        "equipment_type": EquipmentType.drill,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 106,
        "quantity": 6,
        "commissioning_date": date(2020, 11, 18),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous blast-hole drilling",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.news,
        "media_type": "technical_report",
    },
    {
        "asset_name": "Queensland Autonomous Loader Fleet",
        "country_code": "AU",
        "region": "North West Queensland",
        "operation": "Mount Isa District Operations",
        "site": "Copperstone Underground Mine",
        "latitude": -20.975,
        "longitude": 139.49,
        "owner": "Outback Base Metals",
        "owner_country": "AU",
        "manufacturer": "Caterpillar",
        "manufacturer_country": "US",
        "integrator": "RCT",
        "model": "R2900 XE",
        "equipment_type": EquipmentType.loader,
        "max_payload_tonnes": 17.2,
        "operating_weight_tonnes": 62,
        "quantity": 11,
        "commissioning_date": date(2022, 8, 25),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Tele-remote and autonomous loading",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Western Range Excavator Trial",
        "country_code": "AU",
        "region": "Pilbara",
        "operation": "Western Range Operations",
        "site": "Spinifex Ridge Mine",
        "latitude": -22.785,
        "longitude": 117.91,
        "owner": "Western Range Mining",
        "owner_country": "AU",
        "manufacturer": "Hitachi Construction Machinery",
        "manufacturer_country": "JP",
        "integrator": "ASI Mining",
        "model": "EX3600-7",
        "equipment_type": EquipmentType.excavator,
        "max_payload_tonnes": 41,
        "operating_weight_tonnes": 361,
        "quantity": 2,
        "commissioning_date": date(2025, 6, 3),
        "asset_status": AssetStatus.pilot,
        "autonomy_level": "Operator-assist excavation pilot",
        "verification_status": VerificationStatus.rejected,
        "evidence_type": EvidenceType.other,
        "media_type": "video",
    },
    {
        "asset_name": "Atacama Copper Autonomous Haulage Fleet",
        "country_code": "CL",
        "region": "Antofagasta Region",
        "operation": "Atacama Copper Operations",
        "site": "Sierra Roja Mine",
        "latitude": -23.115,
        "longitude": -68.455,
        "owner": "Cordillera Copper SA",
        "owner_country": "CL",
        "manufacturer": "Komatsu",
        "manufacturer_country": "JP",
        "integrator": "Komatsu FrontRunner",
        "model": "930E-5",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 304,
        "operating_weight_tonnes": 224,
        "quantity": 28,
        "commissioning_date": date(2019, 5, 14),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.press_release,
        "media_type": "case_study",
    },
    {
        "asset_name": "Antofagasta Autonomous Blast-Hole Drills",
        "country_code": "CL",
        "region": "Antofagasta Region",
        "operation": "Pacific Desert Operations",
        "site": "Cerro Plata Mine",
        "latitude": -24.205,
        "longitude": -69.15,
        "owner": "Pacific Andes Mining",
        "owner_country": "CL",
        "manufacturer": "Epiroc",
        "manufacturer_country": "SE",
        "integrator": "Epiroc Autonomous Solutions",
        "model": "Pit Viper 351 E",
        "equipment_type": EquipmentType.drill,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 190,
        "quantity": 5,
        "commissioning_date": date(2021, 10, 2),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous drilling with remote supervision",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.news,
        "media_type": "technical_report",
    },
    {
        "asset_name": "Peruvian High Andes Autonomous Fleet",
        "country_code": "PE",
        "region": "Moquegua Region",
        "operation": "High Andes Copper Operations",
        "site": "Condor Pass Mine",
        "latitude": -16.995,
        "longitude": -70.745,
        "owner": "Andes Future Metals",
        "owner_country": "PE",
        "manufacturer": "Liebherr",
        "manufacturer_country": "DE",
        "integrator": "Liebherr Mining Automation",
        "model": "T 284",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 363,
        "operating_weight_tonnes": 237,
        "quantity": 18,
        "commissioning_date": date(2023, 2, 17),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Minas Gerais Autonomous Haulage Fleet",
        "country_code": "BR",
        "region": "Minas Gerais",
        "operation": "Iron Quadrangle Operations",
        "site": "Serra Verde Mine",
        "latitude": -20.145,
        "longitude": -43.78,
        "owner": "Verde Brasil Mineracao",
        "owner_country": "BR",
        "manufacturer": "Caterpillar",
        "manufacturer_country": "US",
        "integrator": "Caterpillar MineStar",
        "model": "793D",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 218,
        "operating_weight_tonnes": 154,
        "quantity": 30,
        "commissioning_date": date(2017, 4, 28),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Para Iron Ore Autonomous Drilling Fleet",
        "country_code": "BR",
        "region": "Para",
        "operation": "Carajas North Operations",
        "site": "Amazon Ridge Mine",
        "latitude": -6.055,
        "longitude": -50.115,
        "owner": "Northern Brazil Iron",
        "owner_country": "BR",
        "manufacturer": "Epiroc",
        "manufacturer_country": "SE",
        "integrator": "Hexagon Mining",
        "model": "SmartROC D65",
        "equipment_type": EquipmentType.drill,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 24,
        "quantity": 9,
        "commissioning_date": date(2022, 6, 9),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous surface drilling",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.government,
        "media_type": "technical_report",
    },
    {
        "asset_name": "Alberta Oil Sands Autonomous Haul Fleet",
        "country_code": "CA",
        "region": "Alberta",
        "operation": "Athabasca Operations",
        "site": "Boreal Sands Mine",
        "latitude": 57.005,
        "longitude": -111.615,
        "owner": "Boreal Energy Resources",
        "owner_country": "CA",
        "manufacturer": "Caterpillar",
        "manufacturer_country": "US",
        "integrator": "Caterpillar MineStar",
        "model": "797F",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 364,
        "operating_weight_tonnes": 261,
        "quantity": 35,
        "commissioning_date": date(2018, 1, 22),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.news,
        "media_type": "case_study",
    },
    {
        "asset_name": "Quebec Iron Autonomous Truck Fleet",
        "country_code": "CA",
        "region": "Quebec",
        "operation": "Labrador Trough Operations",
        "site": "Lac du Nord Mine",
        "latitude": 52.945,
        "longitude": -67.285,
        "owner": "Laurentian Iron Corp",
        "owner_country": "CA",
        "manufacturer": "Komatsu",
        "manufacturer_country": "JP",
        "integrator": "Komatsu FrontRunner",
        "model": "980E-5",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 363,
        "operating_weight_tonnes": 252,
        "quantity": 16,
        "commissioning_date": date(2022, 12, 1),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous haulage with central fleet control",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.press_release,
        "media_type": "video",
    },
    {
        "asset_name": "Canadian Arctic Autonomous Dozer Trial",
        "country_code": "CA",
        "region": "Nunavut",
        "operation": "Arctic Minerals Operations",
        "site": "Tundra Lake Mine",
        "latitude": 64.825,
        "longitude": -96.105,
        "owner": "Arctic Horizon Minerals",
        "owner_country": "CA",
        "manufacturer": "Komatsu",
        "manufacturer_country": "JP",
        "integrator": "ASI Mining",
        "model": "D475A-8",
        "equipment_type": EquipmentType.dozer,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 115,
        "quantity": 5,
        "commissioning_date": date(2025, 8, 12),
        "asset_status": AssetStatus.pilot,
        "autonomy_level": "Remote-supervised autonomous dozing",
        "verification_status": VerificationStatus.pending,
        "evidence_type": EvidenceType.other,
        "media_type": "video",
    },
    {
        "asset_name": "Arizona Copper Autonomous Haulage Fleet",
        "country_code": "US",
        "region": "Arizona",
        "operation": "Sonoran Copper Operations",
        "site": "Copper Basin Mine",
        "latitude": 33.245,
        "longitude": -110.915,
        "owner": "Sonoran Copper LLC",
        "owner_country": "US",
        "manufacturer": "Liebherr",
        "manufacturer_country": "DE",
        "integrator": "Liebherr Mining Automation",
        "model": "T 284",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 363,
        "operating_weight_tonnes": 237,
        "quantity": 24,
        "commissioning_date": date(2020, 2, 11),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.press_release,
        "media_type": "case_study",
    },
    {
        "asset_name": "Nevada Underground Autonomous Loader Pilot",
        "country_code": "US",
        "region": "Nevada",
        "operation": "Great Basin Gold Operations",
        "site": "Silver Peak Underground Mine",
        "latitude": 40.315,
        "longitude": -116.715,
        "owner": "Great Basin Goldworks",
        "owner_country": "US",
        "manufacturer": "Sandvik",
        "manufacturer_country": "SE",
        "integrator": "Sandvik AutoMine",
        "model": "LH514",
        "equipment_type": EquipmentType.loader,
        "max_payload_tonnes": 14,
        "operating_weight_tonnes": 39,
        "quantity": 4,
        "commissioning_date": date(2024, 10, 7),
        "asset_status": AssetStatus.pilot,
        "autonomy_level": "Autonomous loading pilot",
        "verification_status": VerificationStatus.pending,
        "evidence_type": EvidenceType.news,
        "media_type": "video",
    },
    {
        "asset_name": "Sonora Autonomous Haulage Deployment",
        "country_code": "MX",
        "region": "Sonora",
        "operation": "Sierra Madre Operations",
        "site": "Cobre Azul Mine",
        "latitude": 30.185,
        "longitude": -110.615,
        "owner": "Cobre Azul SA",
        "owner_country": "MX",
        "manufacturer": "Caterpillar",
        "manufacturer_country": "US",
        "integrator": "Caterpillar MineStar",
        "model": "794 AC",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 297,
        "operating_weight_tonnes": 203,
        "quantity": 14,
        "commissioning_date": date(2024, 1, 29),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Northern Cape Autonomous Haul Fleet",
        "country_code": "ZA",
        "region": "Northern Cape",
        "operation": "Kalahari Iron Operations",
        "site": "Red Dune Mine",
        "latitude": -28.315,
        "longitude": 23.075,
        "owner": "Kalahari Iron Resources",
        "owner_country": "ZA",
        "manufacturer": "Komatsu",
        "manufacturer_country": "JP",
        "integrator": "Komatsu FrontRunner",
        "model": "930E-4SE",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 290,
        "operating_weight_tonnes": 220,
        "quantity": 20,
        "commissioning_date": date(2019, 8, 6),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
    {
        "asset_name": "Limpopo Autonomous Dozer Fleet",
        "country_code": "ZA",
        "region": "Limpopo",
        "operation": "Bushveld Operations",
        "site": "Marula Ridge Mine",
        "latitude": -24.565,
        "longitude": 29.985,
        "owner": "Bushveld Platinum Group",
        "owner_country": "ZA",
        "manufacturer": "Caterpillar",
        "manufacturer_country": "US",
        "integrator": "RCT",
        "model": "D11",
        "equipment_type": EquipmentType.dozer,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 104,
        "quantity": 7,
        "commissioning_date": date(2023, 5, 19),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Tele-remote autonomous dozing",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.news,
        "media_type": "video",
    },
    {
        "asset_name": "Kalimantan Autonomous Coal Haulage Fleet",
        "country_code": "ID",
        "region": "East Kalimantan",
        "operation": "Mahakam Coal Operations",
        "site": "Borneo East Mine",
        "latitude": -0.615,
        "longitude": 117.215,
        "owner": "Nusantara Coal Resources",
        "owner_country": "ID",
        "manufacturer": "Hitachi Construction Machinery",
        "manufacturer_country": "JP",
        "integrator": "Hitachi Autonomous Haulage",
        "model": "EH5000AC-3",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 296,
        "operating_weight_tonnes": 210,
        "quantity": 22,
        "commissioning_date": date(2021, 1, 13),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous haulage with remote operations centre",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.press_release,
        "media_type": "case_study",
    },
    {
        "asset_name": "Sulawesi Nickel Autonomous Excavator Pilot",
        "country_code": "ID",
        "region": "Central Sulawesi",
        "operation": "Sulawesi Nickel Operations",
        "site": "Morowali Hills Mine",
        "latitude": -2.795,
        "longitude": 121.955,
        "owner": "Equatorial Nickel Indonesia",
        "owner_country": "ID",
        "manufacturer": "Liebherr",
        "manufacturer_country": "DE",
        "integrator": "ASI Mining",
        "model": "R 9400",
        "equipment_type": EquipmentType.excavator,
        "max_payload_tonnes": 40,
        "operating_weight_tonnes": 350,
        "quantity": 3,
        "commissioning_date": date(2025, 4, 21),
        "asset_status": AssetStatus.pilot,
        "autonomy_level": "Semi-autonomous excavation pilot",
        "verification_status": VerificationStatus.pending,
        "evidence_type": EvidenceType.other,
        "media_type": "video",
    },
    {
        "asset_name": "Norrbotten Underground Autonomous Loader Fleet",
        "country_code": "SE",
        "region": "Norrbotten County",
        "operation": "Northern Sweden Operations",
        "site": "Kiruna North Demonstration Mine",
        "latitude": 67.845,
        "longitude": 20.255,
        "owner": "Nordic Iron Innovations",
        "owner_country": "SE",
        "manufacturer": "Sandvik",
        "manufacturer_country": "SE",
        "integrator": "Sandvik AutoMine",
        "model": "LH621i",
        "equipment_type": EquipmentType.loader,
        "max_payload_tonnes": 21,
        "operating_weight_tonnes": 58,
        "quantity": 10,
        "commissioning_date": date(2020, 9, 30),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous underground loading and haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.academic,
        "media_type": "research_paper",
    },
    {
        "asset_name": "Lapland Autonomous Drilling Program",
        "country_code": "FI",
        "region": "Lapland",
        "operation": "Northern Finland Operations",
        "site": "Aurora Deep Mine",
        "latitude": 67.615,
        "longitude": 25.725,
        "owner": "Aurora Nordic Minerals",
        "owner_country": "FI",
        "manufacturer": "Sandvik",
        "manufacturer_country": "SE",
        "integrator": "Sandvik AutoMine",
        "model": "DR410i",
        "equipment_type": EquipmentType.drill,
        "max_payload_tonnes": None,
        "operating_weight_tonnes": 42,
        "quantity": 7,
        "commissioning_date": date(2021, 6, 16),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Autonomous rotary drilling",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.academic,
        "media_type": "research_paper",
    },
    {
        "asset_name": "Gobi Copper Autonomous Haulage Fleet",
        "country_code": "MN",
        "region": "South Gobi",
        "operation": "Gobi Copper Operations",
        "site": "Khulan Desert Mine",
        "latitude": 43.015,
        "longitude": 106.815,
        "owner": "Steppe Copper Holdings",
        "owner_country": "MN",
        "manufacturer": "Komatsu",
        "manufacturer_country": "JP",
        "integrator": "Komatsu FrontRunner",
        "model": "930E-5",
        "equipment_type": EquipmentType.truck,
        "max_payload_tonnes": 304,
        "operating_weight_tonnes": 224,
        "quantity": 25,
        "commissioning_date": date(2018, 10, 5),
        "asset_status": AssetStatus.active,
        "autonomy_level": "Fully autonomous haulage",
        "verification_status": VerificationStatus.verified,
        "evidence_type": EvidenceType.company_report,
        "media_type": "case_study",
    },
]


def seed_demo_data(db: Session) -> None:
    """Insert or enrich a globally distributed, fully synthetic MVP dataset.

    The seed is idempotent. Existing records are matched by asset name, so this
    file can be deployed to an existing Docker volume and safely run again.
    """

    for index, data in enumerate(MOCK_ASSETS, start=1):
        manufacturer = _get_or_create_org(
            db,
            name=data["manufacturer"],
            organisation_type=OrganisationType.manufacturer,
            country=data["manufacturer_country"],
            website=f"https://example.com/manufacturers/{_slug(data['manufacturer'])}",
        )
        owner = _get_or_create_org(
            db,
            name=data["owner"],
            organisation_type=OrganisationType.owner,
            country=data["owner_country"],
            website=f"https://example.com/owners/{_slug(data['owner'])}",
        )
        integrator = _get_or_create_org(
            db,
            name=data["integrator"],
            organisation_type=OrganisationType.integrator,
            country=data["manufacturer_country"],
            website=f"https://example.com/integrators/{_slug(data['integrator'])}",
        )

        region = _get_or_create_location(
            db,
            name=data["region"],
            location_type=LocationType.region,
            country_code=data["country_code"],
            metadata_json={"mock_data": True},
        )
        operation = _get_or_create_location(
            db,
            name=data["operation"],
            location_type=LocationType.operation,
            country_code=data["country_code"],
            parent=region,
            metadata_json={"mock_data": True},
        )
        site = _get_or_create_location(
            db,
            name=data["site"],
            location_type=LocationType.mine_site,
            country_code=data["country_code"],
            parent=operation,
            latitude=data["latitude"],
            longitude=data["longitude"],
            metadata_json={
                "mock_data": True,
                "data_quality": "synthetic demonstration record",
            },
        )

        model = _get_or_create_model(
            db,
            manufacturer=manufacturer,
            model_name=data["model"],
            equipment_type=data["equipment_type"],
            max_payload_tonnes=data["max_payload_tonnes"],
            operating_weight_tonnes=data["operating_weight_tonnes"],
            specifications={
                "mock_data": True,
                "powertrain": "diesel-electric" if data["equipment_type"] == EquipmentType.truck else "diesel",
                "control_mode": data["autonomy_level"],
            },
        )

        equipment = db.scalar(
            select(EquipmentInstance).where(
                func.lower(EquipmentInstance.asset_name) == data["asset_name"].lower()
            )
        )
        if equipment is None:
            equipment = EquipmentInstance(
                asset_name=data["asset_name"],
                submitted_by_name="MVP Mock Data Seeder",
                submitted_by_email="demo@example.com",
            )
            db.add(equipment)

        equipment.model = model
        equipment.location = site
        equipment.owner = owner
        equipment.integrator = integrator
        equipment.quantity = data["quantity"]
        equipment.commissioning_date = data["commissioning_date"]
        equipment.asset_status = data["asset_status"]
        equipment.autonomy_level = data["autonomy_level"]
        equipment.notes = (
            "Synthetic demonstration record for UI, search, map, analytics and moderation testing. "
            "It must not be presented as verified real-world deployment data."
        )
        equipment.verification_status = data["verification_status"]
        equipment.submitted_by_name = "MVP Mock Data Seeder"
        equipment.submitted_by_email = "demo@example.com"
        if data["verification_status"] == VerificationStatus.verified:
            equipment.review_notes = "Mock evidence reviewed for demonstration purposes."
            equipment.reviewed_at = SEED_REVIEWED_AT
        elif data["verification_status"] == VerificationStatus.rejected:
            equipment.review_notes = "Rejected mock submission included to demonstrate moderation states."
            equipment.reviewed_at = SEED_REVIEWED_AT
        else:
            equipment.review_notes = None
            equipment.reviewed_at = None

        db.flush()

        asset_slug = _slug(data["asset_name"])
        evidence_date = data["commissioning_date"] or date(2026, 1, 1)
        _add_evidence_if_missing(
            db,
            equipment=equipment,
            title=f"Mock deployment source: {data['asset_name']}",
            url=f"https://example.com/evidence/{asset_slug}",
            evidence_type=data["evidence_type"],
            publisher="Autonomous Mining Demo Publisher",
            published_date=evidence_date,
        )

        # Add a second evidence item to half the records so detail pages and
        # evidence counts are more useful during demonstrations.
        if index % 2 == 0:
            _add_evidence_if_missing(
                db,
                equipment=equipment,
                title=f"Mock technical summary: {data['site']}",
                url=f"https://example.com/reports/{asset_slug}",
                evidence_type=EvidenceType.company_report,
                publisher="Global Mining Technology Review",
                published_date=evidence_date,
            )

        # Add media/case studies to most verified records and selected pending
        # records, covering several media types used by the UI.
        if index % 3 != 0 or data["verification_status"] != VerificationStatus.verified:
            _add_case_study_if_missing(
                db,
                equipment=equipment,
                organisation=owner,
                location=site,
                title=f"Mock case study: {data['asset_name']}",
                summary=(
                    f"Synthetic case study describing {data['quantity']} {data['model']} units at "
                    f"{data['site']}, including rollout, operational workflow and lessons learned."
                ),
                url=f"https://example.com/case-studies/{asset_slug}",
                media_type=data["media_type"],
            )

    db.commit()
