import json
import logging

from sqlalchemy.orm import Session

from hireable.agents.cv_parser import parse_cv
from hireable.agents.gap_analyzer import analyze_gaps
from hireable.agents.job_searcher import search_job_requirements, search_target_jobs
from hireable.agents.roadmap_builder import build_roadmap
from hireable.database import SessionLocal
from hireable.models.db import SessionModel
from hireable.models.schemas import CVData, GapAnalysis, JobRequirements, SkillTreeBranch

logger = logging.getLogger(__name__)


def _mark_skill_in_tree(node: SkillTreeBranch | None, skill: str) -> None:
    if not node:
        return
    if node.status in ("missing", "unverified") and node.name.lower() == skill.lower():
        node.status = "known"
        return
    for child in node.children:
        _mark_skill_in_tree(child, skill)


def _update_session(db: Session, session_id: str, **kwargs) -> None:
    session = db.get(SessionModel, session_id)
    if not session:
        return
    for key, value in kwargs.items():
        setattr(session, key, value)
    db.commit()


async def run_analysis(session_id: str, file_path: str, target_role: str) -> None:
    """Parse CV, search jobs, analyze gaps — then pause for user review."""
    db = SessionLocal()
    try:
        _update_session(
            db,
            session_id,
            status="parsing",
            progress=10,
            message="Parsing your CV...",
        )

        cv_data = await parse_cv(file_path)
        cv_json = cv_data.model_dump_json()
        _update_session(
            db,
            session_id,
            status="searching",
            progress=30,
            cv_data_json=cv_json,
            message=f"Parsed CV for {cv_data.name or 'candidate'}. Searching job market...",
        )

        job_requirements = await search_job_requirements(target_role)
        job_json = job_requirements.model_dump_json()
        _update_session(
            db,
            session_id,
            status="analyzing",
            progress=55,
            job_requirements_json=job_json,
            message=f"Found requirements for {target_role}. Analyzing skill gaps...",
        )

        gap_analysis = await analyze_gaps(cv_data, job_requirements, target_role)
        _update_session(
            db,
            session_id,
            status="analyzing",
            progress=70,
            message="Finding jobs you'll be ready for after training...",
        )

        try:
            gap_analysis.target_jobs = await search_target_jobs(target_role, cv_data, gap_analysis)
        except Exception as exc:
            logger.warning("Target job search failed for session %s: %s", session_id, exc)
            gap_analysis.target_jobs = []

        gap_json = gap_analysis.model_dump_json()
        _update_session(
            db,
            session_id,
            status="review",
            progress=80,
            gap_analysis_json=gap_json,
            message=(
                f"Hirability score: {gap_analysis.hirability_score}%. "
                "Review your analysis before we build your roadmap."
            ),
        )
    except Exception as exc:
        logger.exception("Analysis failed for session %s", session_id)
        _update_session(
            db,
            session_id,
            status="error",
            progress=0,
            message=f"Analysis failed: {exc}",
        )
    finally:
        db.close()


async def run_roadmap_build(session_id: str) -> None:
    """Build roadmap after user acknowledges the analysis report."""
    db = SessionLocal()
    try:
        session = db.get(SessionModel, session_id)
        if not session or not session.gap_analysis_json:
            return

        _update_session(
            db,
            session_id,
            status="building",
            progress=85,
            message="Building your personalized learning roadmap...",
        )

        cv_data = CVData.model_validate_json(session.cv_data_json or "{}")
        job_requirements = JobRequirements.model_validate_json(session.job_requirements_json or "{}")
        gap_analysis = GapAnalysis.model_validate_json(session.gap_analysis_json)

        claimed = json.loads(session.claimed_skills_json or "[]")
        if claimed:
            for skill in claimed:
                if skill not in gap_analysis.skills_present:
                    gap_analysis.skills_present.append(skill)
                gap_analysis.skills_missing = [s for s in gap_analysis.skills_missing if s != skill]
                _mark_skill_in_tree(gap_analysis.skill_tree, skill)

        roadmap = await build_roadmap(
            db=db,
            session_id=session_id,
            target_role=session.target_role,
            gap_analysis=gap_analysis,
            cv_data_json=session.cv_data_json or cv_data.model_dump_json(),
            job_requirements_json=session.job_requirements_json or job_requirements.model_dump_json(),
        )

        session = db.get(SessionModel, session_id)
        if session:
            session.status = "done"
            session.progress = 100
            session.message = "Your personalized roadmap is ready!"
            session.roadmap_id = roadmap.id
            db.commit()
    except Exception as exc:
        logger.exception("Roadmap build failed for session %s", session_id)
        _update_session(
            db,
            session_id,
            status="error",
            progress=0,
            message=f"Roadmap build failed: {exc}",
        )
    finally:
        db.close()


async def run_pipeline(session_id: str, file_path: str, target_role: str) -> None:
    """Legacy full pipeline — analysis only; roadmap waits for acknowledge."""
    await run_analysis(session_id, file_path, target_role)
