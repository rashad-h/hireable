from hireable.models.schemas import CVData, GapAnalysis, JobRequirements, SkillTreeBranch
from hireable.services.openrouter import chat_completion_json


async def analyze_gaps(cv_data: CVData, job_requirements: JobRequirements, target_role: str) -> GapAnalysis:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior hiring manager and career coach. Compare a candidate's CV against "
                "real job requirements for their target role. Return valid JSON only with keys:\n"
                "- skills_present (array of strings)\n"
                "- skills_missing (array of strings)\n"
                "- skills_partial (array of strings)\n"
                "- gap_score (integer 0-100, current fit for the role)\n"
                "- role_fun_fact (first-person line from a witty finance-cat mascot talking to the learner. "
                "Open with a playful cat vibe — e.g. 'Mrow?', '*purrs*', or a cheeky meow-ish phrase — then drop "
                "one fun fact about the main SKILL TOPIC they'll learn (NOT the job title). Max 1 sentence, "
                "under 140 characters, like the cat is whispering a secret.)\n"
                "- ideal_candidate_summary (2-3 sentences describing the perfect hire for this role)\n"
                "- ideal_skills (array of 8-12 skills the ideal candidate would have)\n"
                "- strengths (array of {skill, detail} — what the candidate does well, tied to their CV)\n"
                "- weaknesses (array of {skill, detail} — explicit gaps that hurt hireability)\n"
                "- hirability_score (integer 0-100 — realistic chance of getting hired for this role TODAY)\n"
                "- goal_assessment (1-2 sentences: is this target role realistic, ambitious, or unrealistic?)\n"
                "- hidden_weaknesses (array of {skill, reason, in_job_descriptions} — skills commonly required "
                "in job postings but ABSENT from the CV; treat omission as a likely gap because candidates "
                "often skip skills they lack)\n"
                "- skills_to_claim (array of {skill, prompt, related_to} — skills the candidate MIGHT have "
                "but didn't mention; ask if they have them. These are NOT learning gaps, just CV omissions)\n"
                "- skill_tree (object — hierarchical skill tree with 3-4 levels):\n"
                "  { name: target role, icon: emoji, status: null, children: [\n"
                "    { name: domain (e.g. 'Core ML', 'DevOps', 'Soft Skills'), icon: emoji, status: null,\n"
                "      children: [\n"
                "        { name: sub-domain (e.g. 'Model Training', 'Cloud Deploy'), icon: '', status: null,\n"
                "          children: [\n"
                "            { name: 'PyTorch', status: 'known|partial|missing|unverified', children: [] }\n"
                "          ]\n"
                "        }\n"
                "      ]\n"
                "    }\n"
                "  ]}\n"
                "  Rules: root = target role. Level 2 = 3-5 broad domains. Level 3 = 2-4 sub-domains each. "
                "Level 4 = individual skills (leaves with status). Every branch must have 2+ children. "
                "Leaves ONLY have status (known/partial/missing/unverified), branches have status=null. "
                "Use unverified for skills_to_claim items. Cover ALL ideal_skills in the tree.\n"
                "Be honest and specific. hirability_score should reflect real market expectations."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Target role: {target_role}\n\n"
                f"CV Data:\n{cv_data.model_dump_json()}\n\n"
                f"Job Requirements:\n{job_requirements.model_dump_json()}\n\n"
                "Produce a thorough gap analysis with a deep hierarchical skill tree."
            ),
        },
    ]
    data, _ = await chat_completion_json(messages)
    return GapAnalysis.model_validate(data)
