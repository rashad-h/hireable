"""Seed a demo roadmap session for reliable demos."""

import json
import uuid

from hireable.database import SessionLocal, init_db
from hireable.models.db import Lesson, Progress, Roadmap, SessionModel, Subtopic, Topic

DEMO_SESSION_ID = "demo-session-0000-0000-0000-000000000001"
DEMO_ROADMAP_ID = "demo-roadmap-0000-0000-0000-000000000001"


def seed() -> None:
    init_db()
    db = SessionLocal()

    existing = db.get(SessionModel, DEMO_SESSION_ID)
    if existing:
        print(f"Demo session already exists: {DEMO_SESSION_ID}")
        db.close()
        return

    cv_data = {
        "name": "Alex Demo",
        "email": "alex@demo.com",
        "skills": ["Python", "SQL", "Git"],
        "experience": [{"title": "Junior Developer", "company": "Demo Corp", "duration": "2 years", "description": "Built APIs"}],
        "education": [{"degree": "BSc Computer Science", "institution": "Demo University", "year": "2022"}],
        "certifications": [],
    }
    job_requirements = {
        "required_skills": ["Python", "Machine Learning", "Docker", "SQL"],
        "nice_to_have": ["Kubernetes", "PyTorch"],
        "tools": ["Git", "Jupyter"],
        "experience_years": 2,
    }
    gap_analysis = {
        "skills_present": ["Python", "SQL", "Git"],
        "skills_missing": ["Machine Learning", "Docker"],
        "skills_partial": ["Python"],
        "gap_score": 62,
        "role_fun_fact": "The title 'ML Engineer' barely existed before 2015 — today it's one of the fastest-growing job titles in tech, with demand outpacing supply by nearly 3x.",
        "ideal_candidate_summary": "A strong ML Engineer combines solid Python and ML fundamentals with production deployment skills using Docker and cloud platforms.",
        "ideal_skills": ["Python", "Machine Learning", "PyTorch", "Docker", "SQL", "MLOps", "Git", "Statistics"],
        "strengths": [
            {"skill": "Python", "detail": "Listed as a core skill with 2 years of API development experience."},
            {"skill": "SQL", "detail": "Present on CV and relevant for data pipelines."},
        ],
        "weaknesses": [
            {"skill": "Machine Learning", "detail": "Required for ML Engineer roles but not demonstrated on CV."},
            {"skill": "Docker", "detail": "Common requirement for deploying ML models, absent from CV."},
        ],
        "hirability_score": 38,
        "goal_assessment": "ML Engineer is ambitious from a Junior Developer background. With focused upskilling on ML and deployment, this goal is achievable in 6-12 months.",
        "hidden_weaknesses": [
            {"skill": "Statistics", "reason": "Appears in most ML job postings but not mentioned on your CV.", "in_job_descriptions": True},
        ],
        "skills_to_claim": [
            {"skill": "Jupyter", "prompt": "Have you used Jupyter notebooks for data exploration?", "related_to": "Python"},
        ],
        "skill_tree": {
            "name": "ML Engineer",
            "icon": "🎯",
            "status": None,
            "children": [
                {
                    "name": "Core ML",
                    "icon": "🧠",
                    "status": None,
                    "children": [
                        {
                            "name": "Programming",
                            "status": None,
                            "children": [
                                {"name": "Python", "status": "known", "children": []},
                                {"name": "Statistics", "status": "missing", "children": []},
                            ],
                        },
                        {
                            "name": "ML Fundamentals",
                            "status": None,
                            "children": [
                                {"name": "Machine Learning", "status": "missing", "children": []},
                                {"name": "PyTorch", "status": "missing", "children": []},
                            ],
                        },
                    ],
                },
                {
                    "name": "Engineering",
                    "icon": "🔧",
                    "status": None,
                    "children": [
                        {
                            "name": "Data",
                            "status": None,
                            "children": [
                                {"name": "SQL", "status": "known", "children": []},
                                {"name": "Jupyter", "status": "unverified", "children": []},
                            ],
                        },
                        {
                            "name": "DevOps",
                            "status": None,
                            "children": [
                                {"name": "Git", "status": "known", "children": []},
                                {"name": "Docker", "status": "missing", "children": []},
                                {"name": "MLOps", "status": "missing", "children": []},
                            ],
                        },
                    ],
                },
            ],
        },
        "target_jobs": [
            {
                "title": "Junior ML Engineer",
                "company": "Spotify",
                "location": "London, UK",
                "url": "https://www.linkedin.com/jobs/search/?keywords=junior%20ml%20engineer",
                "salary_range": "£45k–£60k",
                "why_ready": "After your roadmap covers ML fundamentals and Docker, your Python and SQL background aligns with their junior ML pipeline roles.",
                "key_requirements": ["Python", "SQL", "Machine Learning basics", "Git"],
                "training_focus": ["Machine Learning", "Docker"],
            },
            {
                "title": "ML Engineer I",
                "company": "Monzo",
                "location": "Remote, UK",
                "url": "https://www.linkedin.com/jobs/search/?keywords=ml%20engineer%20monzo",
                "salary_range": "£50k–£65k",
                "why_ready": "Monzo hires engineers with strong Python who can grow into ML — your training plan closes the ML and deployment gaps they expect.",
                "key_requirements": ["Python", "ML models", "Production deployment", "SQL"],
                "training_focus": ["Machine Learning", "Docker", "MLOps"],
            },
            {
                "title": "Associate Data Scientist",
                "company": "Deliveroo",
                "location": "London, UK",
                "url": "https://www.linkedin.com/jobs/search/?keywords=associate%20data%20scientist%20deliveroo",
                "salary_range": "£42k–£55k",
                "why_ready": "A stepping-stone role that values Python and SQL — completing ML training makes you a strong fit within 6 months.",
                "key_requirements": ["Python", "Statistics", "SQL", "Experimentation"],
                "training_focus": ["Machine Learning", "Statistics"],
            },
        ],
    }

    roadmap = Roadmap(
        id=DEMO_ROADMAP_ID,
        session_id=DEMO_SESSION_ID,
        title="ML Engineer Demo Roadmap",
        target_role="ML Engineer",
        gap_score=62,
        cv_data=json.dumps(cv_data),
        job_requirements=json.dumps(job_requirements),
        gap_analysis=json.dumps(gap_analysis),
    )

    session = SessionModel(
        id=DEMO_SESSION_ID,
        cv_filename="demo-cv.pdf",
        target_role="ML Engineer",
        status="done",
        progress=100,
        message="Demo roadmap ready",
        roadmap_id=DEMO_ROADMAP_ID,
    )
    db.add(session)
    db.add(roadmap)
    db.flush()

    topic = Topic(
        id=str(uuid.uuid4()),
        roadmap_id=DEMO_ROADMAP_ID,
        title="Machine Learning Fundamentals",
        description="Core ML concepts to close your biggest gaps.",
        order_index=0,
        icon="🧠",
        color="#6C63FF",
        xp_total=75,
    )
    db.add(topic)
    db.flush()

    subtopic = Subtopic(
        id=str(uuid.uuid4()),
        topic_id=topic.id,
        title="Supervised Learning",
        order_index=0,
    )
    db.add(subtopic)
    db.flush()

    lesson1 = Lesson(
        id=str(uuid.uuid4()),
        subtopic_id=subtopic.id,
        title="Introduction to ML",
        description="Learn the basics of machine learning workflows.",
        estimated_minutes=15,
        xp_reward=25,
        order_index=0,
        is_locked=False,
        resources=json.dumps([
            {"type": "youtube", "title": "Machine Learning Explained", "url": "https://www.youtube.com/watch?v=ukzFI9rgwfU"},
            {"type": "article", "title": "ML Guide", "url": "https://developers.google.com/machine-learning/crash-course"},
        ]),
        flashcards=json.dumps([
            {"front": "What is supervised learning?", "back": "Learning from labeled input-output pairs to predict outcomes on new data."},
            {"front": "What is a feature?", "back": "An individual measurable property used as input to a model."},
        ]),
        quiz=json.dumps([
            {
                "question": "What does ML stand for?",
                "options": ["Machine Learning", "Manual Logic", "Meta Language", "Model Layer"],
                "correct": "Machine Learning",
                "explanation": "ML is Machine Learning.",
            }
        ]),
    )
    lesson2 = Lesson(
        id=str(uuid.uuid4()),
        subtopic_id=subtopic.id,
        title="Training Models",
        description="Understand train/test splits and evaluation.",
        estimated_minutes=20,
        xp_reward=25,
        order_index=1,
        is_locked=True,
        prerequisite_lesson_id=lesson1.id,
    )
    db.add(lesson1)
    db.add(lesson2)

    db.commit()
    db.close()
    print(f"Seeded demo session: {DEMO_SESSION_ID}")
    print(f"Demo roadmap: {DEMO_ROADMAP_ID}")


if __name__ == "__main__":
    seed()
