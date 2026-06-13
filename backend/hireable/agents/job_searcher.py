from hireable.models.schemas import CVData, GapAnalysis, JobRequirements, TargetJobListing
from hireable.services.openrouter import chat_completion_json


async def search_job_requirements(target_role: str) -> JobRequirements:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a career analyst. Search the web for current job requirements for the given role. "
                "Return valid JSON only with keys: required_skills (array), nice_to_have (array), "
                "tools (array), experience_years (integer). Base answers on real job postings from 2025-2026."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Find current job requirements for: {target_role}. "
                f"Search for '{target_role} job requirements 2026 skills' and "
                f"'{target_role} required qualifications'."
            ),
        },
    ]
    data, _ = await chat_completion_json(messages, web_search=True, max_results=8)
    return JobRequirements.model_validate(data)


def _skills_after_training(gap_analysis: GapAnalysis) -> list[str]:
    return list(
        dict.fromkeys(
            gap_analysis.skills_present
            + gap_analysis.skills_partial
            + gap_analysis.skills_missing
        )
    )


def _enrich_job_urls(jobs: list[TargetJobListing], citations: list[dict]) -> list[TargetJobListing]:
    citation_urls = [c.get("url", "") for c in citations if c.get("url")]
    if not citation_urls:
        return jobs

    enriched: list[TargetJobListing] = []
    used_urls: set[str] = set()
    for i, job in enumerate(jobs):
        url = job.url.strip()
        if not url or url == "#" or not url.startswith("http"):
            for candidate in citation_urls:
                if candidate not in used_urls:
                    url = candidate
                    used_urls.add(candidate)
                    break
        elif url.startswith("http"):
            used_urls.add(url)
        enriched.append(job.model_copy(update={"url": url}))
    return enriched


async def search_target_jobs(
    target_role: str,
    cv_data: CVData,
    gap_analysis: GapAnalysis,
) -> list[TargetJobListing]:
    future_skills = _skills_after_training(gap_analysis)
    messages = [
        {
            "role": "system",
            "content": (
                "You are a career coach. Search the web for REAL current job listings the candidate "
                "could realistically apply to AFTER completing training to close their skill gaps.\n"
                "Return valid JSON only: { \"jobs\": [ { title, company, location, url, salary_range, "
                "why_ready, key_requirements (array), training_focus (array) } ] }\n"
                "Rules:\n"
                "- Find 4-6 real job postings from LinkedIn, Indeed, Glassdoor, or company career pages\n"
                "- url MUST be a direct link to the job posting from your search results\n"
                "- why_ready: 1-2 sentences explaining why they'll qualify after the roadmap closes their gaps\n"
                "- training_focus: skills from their gap analysis this job needs that the roadmap will teach\n"
                "- key_requirements: top 3-5 requirements from the listing\n"
                "- Pick jobs slightly aspirational but reachable after training (not senior roles if they're junior)\n"
                "- salary_range: include if found, else empty string"
            ),
        },
        {
            "role": "user",
            "content": (
                f"Target role: {target_role}\n"
                f"Candidate name: {cv_data.name}\n"
                f"Current skills: {', '.join(cv_data.skills) or 'none listed'}\n"
                f"Skills after training: {', '.join(future_skills)}\n"
                f"Current gaps to close: {', '.join(gap_analysis.skills_missing)}\n"
                f"Hirability today: {gap_analysis.hirability_score}%\n\n"
                f"Search for '{target_role} jobs 2026 hiring' and find listings they'd be ready for "
                f"after completing training on: {', '.join(gap_analysis.skills_missing[:6])}."
            ),
        },
    ]
    data, citations = await chat_completion_json(messages, web_search=True, max_results=10)
    raw_jobs = data.get("jobs", data.get("items", []))
    if not isinstance(raw_jobs, list):
        raw_jobs = []
    jobs = [TargetJobListing.model_validate(item) for item in raw_jobs[:6]]
    return _enrich_job_urls(jobs, citations)
