from api.models import Project, ProfessionalDevelopment

PROJECTS = [
    {
        "name": "GlowUp",
        "tech": "Django · React · Python · TailwindCSS",
        "project_type": "academic",
        "description": (
            "A full-stack skincare recommendation platform using Django and React. "
            "Integrates computer vision AI to detect skin tone from user-uploaded photos "
            "and a recommendation engine that matches skin types with products using cosine similarity."
        ),
        "tech_stack": {
            "languages":   ["Python", "JavaScript"],
            "frameworks":  ["Django", "React.js", "Tailwind CSS"],
            "tools":       ["PostgreSQL", "REST APIs", "Computer Vision AI"],
        },
        "features": [
            "AI-powered skin tone detection from uploaded photos",
            "Cosine similarity-based product recommendation engine",
            "Personalised skincare analysis dashboard",
            "Full-stack Django + React architecture",
        ],
        "github_link": "https://github.com/archanatimilsina/GlowUp",
    },
    {
        "name": "Elsa Dairy",
        "tech": "Django REST Framework · React · JWT",
        "project_type": "solo",
        "description": (
            "A dairy e-commerce site built with Django REST Framework and React with styled-components. "
            "Features JWT authentication for secure user sessions, cart functionality, "
            "real-time product search, and category filtering."
        ),
        "tech_stack": {
            "languages":   ["Python", "JavaScript"],
            "frameworks":  ["Django REST Framework", "React.js", "Styled Components"],
            "tools":       ["JWT Authentication", "REST APIs", "SQLite"],
        },
        "features": [
            "JWT authentication for secure user sessions",
            "Cart functionality with session management",
            "Real-time product search and category filtering",
            "Dairy e-commerce storefront",
        ],
        "github_link": "https://github.com/archanatimilsina/Dairy-Management-System",
    },
    {
        "name": "Tasksphere",
        "tech": "Laravel · React · RESTful API",
        "project_type": "academic",
        "description": (
            "An enterprise-grade task and employee management workspace built with Laravel and React. "
            "Features automated email notifications, structured data flow using React hooks, "
            "and RESTful API architecture."
        ),
        "tech_stack": {
            "languages":   ["PHP", "JavaScript"],
            "frameworks":  ["Laravel", "React.js"],
            "tools":       ["MySQL", "REST APIs", "Email Notifications"],
        },
        "features": [
            "Management workspace with RESTful API architecture",
            "Automated email notifications",
            "Structured data flow using React hooks",
            "Employee and task tracking",
        ],
        "github_link": "https://github.com/archanatimilsina/TaskSphere",
    },
    {
        "name": "Aahar",
        "tech": "Node.js · Express.js · MongoDB",
        "project_type": "group",
        "description": (
            "A community-focused web platform for homemade food selling, "
            "built during the WLIT Hackathon using Node.js, Express.js, and MongoDB. "
            "Empowers local home chefs to list and manage their culinary offerings."
        ),
        "tech_stack": {
            "languages":   ["JavaScript"],
            "frameworks":  ["Node.js", "Express.js"],
            "tools":       ["MongoDB", "REST APIs"],
        },
        "features": [
            "Platform for local home chefs to list food offerings",
            "WLIT Hackathon project",
            "Node.js + Express + MongoDB stack",
            "Community-focused marketplace",
        ],
        "github_link": "https://github.com/archanatimilsina/Aahar",
    },
    {
        "name": "SoulAPI",
        "tech": "Laravel · REST API · Token Auth",
        "project_type": "solo",
        "description": (
            "A Laravel-based RESTful API with token authentication designed for tourist applications. "
            "Engineered as an API practice project focusing on clean architecture and secure endpoints."
        ),
        "tech_stack": {
            "languages":   ["PHP"],
            "frameworks":  ["Laravel"],
            "tools":       ["MySQL", "Token Authentication", "Postman"],
        },
        "features": [
            "Token-based authentication for secure access",
            "RESTful API architecture for tourist data",
            "Clean Laravel API design patterns",
        ],
        "github_link": "https://github.com/archanatimilsina/soulApi",
    },
]

PROFESSIONAL_DEV = [
    {
        "name": "Mentorship",
        "subject": "Software Test Automation",
        "company": "Jankari Tech",
        "duration": "Sep 2025 – Nov 2025",
        "learnings": [
            "Participated in a mentorship program focused on TypeScript, Playwright automation testing, Docker, and CI/CD workflows.",
            "Performed end-to-end (E2E) testing for the OpenTalk project, including feature file creation and peer reviews.",
            "Strengthened skills in Linux commands, containerisation with Docker, and continuous integration using GitLab CI.",
            "Designed clean, deterministic E2E browser automation workflows using Playwright.",
        ],
        "skills_acquired": [
            "Playwright", "TypeScript", "Docker", "GitLab CI/CD",
            "E2E Testing", "BDD / Gherkin", "Linux", "Regression Testing",
        ],
    },
    {
        "name": "Internship",
        "subject": "Fullstack Web Development",
        "company": "Xdezo Academy",
        "duration": "May 2024 – Aug 2024",
        "learnings": [
            "Developed three solo applications using PHP/Laravel, focusing on database management and MVT architecture.",
            "Engineered maintainable server architectures using solid relational schema designs.",
            "Managed front-end application state properties cleanly across high-fidelity dashboards.",
            "Optimised query execution and normalised multi-table database profiles.",
        ],
        "skills_acquired": [
            "PHP", "Laravel", "MySQL", "MVT Architecture",
            "Database Optimisation", "REST APIs", "React.js",
        ],
    },
    {
        "name": "Fellowship",
        "subject": "Personal & Technical Skills Development",
        "company": "Women Leaders in Technology (WLiT)",
        "duration": "6-month Program · 2025",
        "learnings": [
            "Joined sessions for Personal Development: Goal setting, Empathy, and Time Management.",
            "Learned Node.js, Express.js, MongoDB, and GitHub in a 7-day bootcamp.",
            "Participated in hackathons — built Aahar, a local food selling platform.",
            "Practiced collaborative peer-driven architectural evaluations and mentorship design.",
        ],
        "skills_acquired": [
            "Node.js", "Express.js", "MongoDB", "GitHub",
            "Technical Leadership", "Agile Methodologies", "Open Source Design",
        ],
    },
    {
        "name": "Course",
        "subject": "Fullstack Web Development",
        "company": "Self / Certification",
        "duration": "May 2023 – Aug 2023",
        "learnings": [
            "Mastered Laravel framework and MySQL database management.",
            "Built full production-grade web applications end-to-end.",
        ],
        "skills_acquired": ["Laravel", "PHP", "MySQL", "Full Stack Development"],
    },
    {
        "name": "Session",
        "subject": "Design Thinking and UI/UX",
        "company": "GCES Girls Tech",
        "duration": "2025",
        "learnings": [
            "Practical experience in user-centric design principles.",
            "Applied design thinking methodology to real product challenges.",
        ],
        "skills_acquired": ["UI/UX Design", "Design Thinking", "User Research", "Prototyping"],
    },
    {
        "name": "Session",
        "subject": "Django / Python Workshop",
        "company": "Self / Workshop",
        "duration": "2023",
        "learnings": [
            "Applied MVT principles to build functional Django web applications.",
            "Practised building REST APIs and data models with Django ORM.",
        ],
        "skills_acquired": ["Django", "Python", "MVT", "Django ORM"],
    },
]

# ── Projects ──────────────────────────────────────────────────────────────────
for data in PROJECTS:
    obj, created = Project.objects.get_or_create(
        name=data["name"],
        defaults={
            "tech":         data["tech"],
            "project_type": data["project_type"],
            "description":  data["description"],
            "tech_stack":   data["tech_stack"],
            "features":     data["features"],
            "github_link":  data["github_link"],
        },
    )
    print(f"{'✔ Created' if created else '– Skipped'}: {obj.name}")


for data in PROFESSIONAL_DEV:
    obj, created = ProfessionalDevelopment.objects.get_or_create(
        name=data["name"],
        company=data["company"],
        defaults={
            "subject":         data["subject"],
            "duration":        data["duration"],
            "learnings":       data["learnings"],
            "skills_acquired": data["skills_acquired"],
        },
    )
    print(f"{'✔ Created' if created else '– Skipped'}: {obj.name} @ {obj.company}")

print("\n✅ Seed complete. Upload certificate images via Django admin.")