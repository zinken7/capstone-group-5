from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def ensure_postgis() -> None:
    """Enable PostGIS and a spatial index when running on PostgreSQL."""
    if engine.dialect.name != "postgresql":
        return
    statements = [
        "CREATE EXTENSION IF NOT EXISTS postgis",
        """
        ALTER TABLE locations
        ADD COLUMN IF NOT EXISTS geom geography(Point, 4326)
        GENERATED ALWAYS AS (
            CASE
                WHEN latitude IS NULL OR longitude IS NULL THEN NULL
                ELSE ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
            END
        ) STORED
        """,
        "CREATE INDEX IF NOT EXISTS ix_locations_geom_gist ON locations USING GIST (geom)",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
