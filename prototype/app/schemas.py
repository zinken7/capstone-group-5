from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, model_validator

from app.models import AssetStatus, EquipmentType, EvidenceType, VerificationStatus


class EvidenceCreate(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    url: HttpUrl
    evidence_type: EvidenceType
    publisher: str | None = Field(default=None, max_length=200)
    published_date: date | None = None


class CaseStudyCreate(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    summary: str | None = Field(default=None, max_length=2000)
    url: HttpUrl
    media_type: str = Field(default="case_study", max_length=50)


class SubmissionCreate(BaseModel):
    asset_name: str = Field(min_length=2, max_length=200)
    equipment_type: EquipmentType
    manufacturer_name: str = Field(min_length=2, max_length=200)
    model_name: str = Field(min_length=1, max_length=150)
    max_payload_tonnes: float | None = Field(default=None, ge=0, le=1000)
    operating_weight_tonnes: float | None = Field(default=None, ge=0, le=5000)
    owner_name: str | None = Field(default=None, max_length=200)
    integrator_name: str | None = Field(default=None, max_length=200)
    mine_site_name: str = Field(min_length=2, max_length=200)
    parent_operation_name: str | None = Field(default=None, max_length=200)
    region_name: str | None = Field(default=None, max_length=200)
    country_code: str = Field(min_length=2, max_length=2)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    quantity: int = Field(default=1, ge=1, le=100000)
    commissioning_date: date | None = None
    asset_status: AssetStatus = AssetStatus.unknown
    autonomy_level: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)
    submitted_by_name: str = Field(min_length=2, max_length=150)
    submitted_by_email: EmailStr
    evidence: list[EvidenceCreate] = Field(min_length=1, max_length=10)
    case_studies: list[CaseStudyCreate] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def normalize_country_code(self):
        self.country_code = self.country_code.upper()
        return self


class ReviewRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


class EquipmentSummary(BaseModel):
    id: int
    asset_name: str
    equipment_type: str
    manufacturer: str
    model_name: str
    mine_site: str
    country_code: str
    latitude: float | None
    longitude: float | None
    owner: str | None
    integrator: str | None
    quantity: int
    commissioning_date: date | None
    asset_status: str
    verification_status: VerificationStatus
    evidence_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedEquipment(BaseModel):
    items: list[EquipmentSummary]
    page: int
    page_size: int
    total: int
    pages: int
