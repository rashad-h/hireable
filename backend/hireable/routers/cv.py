import json
import math
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from hireable.agents.cv_parser import save_upload
from hireable.agents.pipeline import run_analysis, run_roadmap_build
from hireable.config import settings
from hireable.database import get_db
from hireable.models.db import SessionModel
from hireable.models.schemas import (
    AcknowledgeAnalysisRequest,
    AnalysisReportResponse,
    CVData,
    GapAnalysis,
    JobRequirements,
    StatusResponse,
    UploadResponse,
)

router = APIRouter(prefix="/api/cv", tags=["cv"])


def _parse_gap_analysis(session: SessionModel) -> GapAnalysis | None:
    if not session.gap_analysis_json:
        return None
    return GapAnalysis.model_validate_json(session.gap_analysis_json)


@router.post("/upload", response_model=UploadResponse)
async def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    job_title: str = Form("Software Engineer"),
    db: Session = Depends(get_db),
) -> UploadResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    content = await file.read()
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File appears to be empty.")

    safe_name = f"{uuid.uuid4()}_{Path(file.filename).name}"
    file_path = save_upload(settings.uploads_dir, safe_name, content)

    session = SessionModel(
        cv_filename=file.filename,
        target_role=job_title.strip() or "Software Engineer",
        status="parsing",
        progress=5,
        message="Upload received. Starting analysis...",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    background_tasks.add_task(run_analysis, session.id, file_path, session.target_role)

    return UploadResponse(session_id=session.id, status="processing")


@router.get("/{session_id}/status", response_model=StatusResponse)
def get_status(session_id: str, db: Session = Depends(get_db)) -> StatusResponse:
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    gap = _parse_gap_analysis(session)
    skill_tree = gap.skill_tree if gap else None

    return StatusResponse(
        status=session.status,
        progress=session.progress,
        message=session.message,
        roadmap_id=session.roadmap_id,
        skill_tree=skill_tree,
        target_role=session.target_role,
    )


@router.get("/{session_id}/analysis", response_model=AnalysisReportResponse)
def get_analysis(session_id: str, db: Session = Depends(get_db)) -> AnalysisReportResponse:
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.gap_analysis_json:
        raise HTTPException(status_code=404, detail="Analysis not ready yet.")

    cv_data = CVData.model_validate_json(session.cv_data_json or "{}")
    job_requirements = JobRequirements.model_validate_json(session.job_requirements_json or "{}")
    gap_analysis = GapAnalysis.model_validate_json(session.gap_analysis_json)
    claimed_skills = json.loads(session.claimed_skills_json or "[]")

    return AnalysisReportResponse(
        target_role=session.target_role,
        candidate_name=cv_data.name or "Candidate",
        cv_data=cv_data,
        job_requirements=job_requirements,
        gap_analysis=gap_analysis,
        claimed_skills=claimed_skills,
    )


@router.post("/{session_id}/acknowledge", response_model=StatusResponse)
async def acknowledge_analysis(
    session_id: str,
    body: AcknowledgeAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> StatusResponse:
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status != "review":
        raise HTTPException(status_code=400, detail="Analysis is not ready for review.")

    session.claimed_skills_json = json.dumps(body.claimed_skills)
    db.commit()

    background_tasks.add_task(run_roadmap_build, session_id)

    return StatusResponse(
        status="building",
        progress=85,
        message="Building your personalized learning roadmap...",
        roadmap_id=None,
        target_role=session.target_role,
    )
