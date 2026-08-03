def sample_payload():
    return {
        "asset_name": "Test Autonomous Fleet",
        "equipment_type": "Truck",
        "manufacturer_name": "Test Manufacturer",
        "model_name": "TX-100",
        "max_payload_tonnes": 100,
        "operating_weight_tonnes": 75,
        "owner_name": "Test Owner",
        "integrator_name": "Test Integrator",
        "mine_site_name": "Test Mine",
        "parent_operation_name": "Test Operations",
        "region_name": "Test Region",
        "country_code": "AU",
        "latitude": -31.95,
        "longitude": 115.86,
        "quantity": 4,
        "commissioning_date": "2026-01-10",
        "asset_status": "pilot",
        "autonomy_level": "Supervised autonomous haulage",
        "notes": "Test record",
        "submitted_by_name": "Test User",
        "submitted_by_email": "test@example.com",
        "evidence": [
            {
                "title": "Public evidence",
                "url": "https://example.com/evidence",
                "evidence_type": "press_release",
                "publisher": "Example",
                "published_date": "2026-01-10",
            }
        ],
        "case_studies": [],
    }


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_submission_moderation_and_publication(client):
    created = client.post("/api/submissions", json=sample_payload())
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert created.json()["status"] == "pending"

    public_before = client.get("/api/equipment")
    assert public_before.status_code == 200
    assert all(item["id"] != item_id for item in public_before.json()["items"])

    unauthorized = client.post(
        f"/api/admin/submissions/{item_id}/approve", json={"notes": "ok"}
    )
    assert unauthorized.status_code == 401

    approved = client.post(
        f"/api/admin/submissions/{item_id}/approve",
        json={"notes": "Evidence checked"},
        headers={"X-Admin-Key": "test-admin-key"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "verified"

    public_after = client.get("/api/equipment")
    assert any(item["id"] == item_id for item in public_after.json()["items"])

    map_response = client.get("/api/map")
    assert map_response.status_code == 200
    assert any(f["properties"]["id"] == item_id for f in map_response.json()["features"])


def test_submission_requires_evidence(client):
    payload = sample_payload()
    payload["evidence"] = []
    response = client.post("/api/submissions", json=payload)
    assert response.status_code == 422


def test_analytics(client):
    response = client.get("/api/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["totals"]["records"] >= 1
    assert body["totals"]["assets"] >= 4



def test_html_pages_and_static_assets(client):
    for path in ["/", "/explore", "/submit", "/admin", "/static/app.js", "/static/styles.css"]:
        response = client.get(path)
        assert response.status_code == 200


def test_include_all_statuses(client):
    response = client.get("/api/equipment?include_all=true")
    assert response.status_code == 200
    statuses = {item["verification_status"] for item in response.json()["items"]}
    assert "verified" in statuses
