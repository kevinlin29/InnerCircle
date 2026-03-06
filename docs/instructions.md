import { Callout, Steps } from "nextra/components";

# Course Project

The course project is a central component of this course, accounting for **50%** of your final grade. It is a more substantial undertaking than the individual assignments and is designed to be completed collaboratively in teams of **2 to 4 students**. This project allows you to apply and expand upon the concepts and skills learned in class by creating a **full-stack web application**.

[Project Deliverables](#project-deliverables) &middot; [Project Idea](#project-idea) &middot; [Project Proposal](#project-proposal) &middot; [Presentation](#presentation) &middot; [Final Project Deliverable](#final-project-deliverable) &middot; [Tips](#tips-and-suggestions)

## Project Deliverables

Your course project involves two major deliverables:

1. **Project Proposal** (due on **Monday, March 2, 2026**): <span className="highlight-red-bold">15% of final grade</span>
   - A Markdown document outlining the project’s motivation, objectives, features, and tentative plan.

2. **Presentation** (delivered during Lectures 10 and 11, **Friday, March 20 & March 27, 2026**): <span className="highlight-red-bold">10% of final grade</span>
   - A 6-minute in-class presentation showcasing your project’s features and technical implementation as completed by **March 19, 2026**. While project development may continue until the Final Project Deliverable deadline, the presentation must reflect only the work completed by March 19 to ensure fairness across presentation sessions.
   - The presentation will be graded 5% by peer review and 5% by instructor & TAs using the same [rubric](/project/presentation/presentation-rubric).

3. **Final Project Deliverable** (due on **Friday, April 3, 2026**): <span className="highlight-red-bold">25% of final grade</span>
   - **Source Code**: Delivered as a public or private Git repository on GitHub. Ensure that your repository is well-organized, with clear structure and comments.
   - **Final Report**: A detailed report to ensure full reproducibility of your work, delivered as a `README.md` file in your GitHub repository.
   - **AI Interaction Record**: Documentation of 1–3 meaningful AI interactions that meaningfully influenced your project, provided as an `ai-session.md` file in the GitHub repository.
   - **Video Demo**: A video demonstration of your project, lasting between 1 and 5 minutes. The demo should highlight the key features and functionality of your application. Include the video URL in the `## Video Demo` section of your final report (the `README.md` file).

## Project Idea

The course project represents a more innovative and time-consuming piece of work than the individual assignments. It is designed to simulate a realistic, collaborative full-stack development experience and consists of four key stages: **team formation**, **project proposal**, **in-class presentation**, and **final deliverable submission by the specified deadline**.

Your course project <span className="highlight-red-bold">MUST</span> be a **full-stack web application** implemented using **TypeScript** and <span className="highlight-red-bold">MUST</span> incorporate the following technologies and features:

### Core Technical Requirements

<Steps>

#### Frontend Requirements (Required for ALL projects)

- TypeScript for all frontend code
- React or Next.js for UI development
- Tailwind CSS for styling
- shadcn/ui or similar component libraries
- Responsive design implementation

#### Data Storage Requirements (Required for ALL projects)

- TypeScript for all backend/server code
- PostgreSQL or SQLite for relational database
- Cloud storage for basic file handling (e.g., uploading and downloading files, associating stored files with users or database records)

Note: You may choose any cloud storage service for file handling in this project. [DigitalOcean Spaces](https://www.digitalocean.com/products/spaces) (object storage) will be introduced in lecture as a concrete example, but you are free to use alternatives (e.g., AWS S3, Google Cloud Storage), as long as your application clearly demonstrates basic upload/download functionality and proper integration with your backend and database.

#### Choose ONE Architecture Approach

**Option A: Next.js Full-Stack**

- Next.js with App Router
- Server Components for backend logic
- API Routes for data handling
- Server Actions for mutations

**Option B: Separate Frontend & Backend**

- Frontend: React with required frontend technologies
- Backend: Express.js server
- RESTful API design
- Proper API documentation

</Steps>

### Advanced Features (Must implement at least two)

- **User Authentication and Authorization**: Support authenticated users with appropriate access control. This typically includes:
  - User registration and login
  - Session or token-based authentication
  - Protected routes or APIs
  - Role-based or permission-based access control (if applicable)

  Recommended framework: [Better Auth](https://www.better-auth.com/docs/introduction)

- **Real-Time Functionality**: Support **live, real-time updates** without requiring a page refresh. Examples include:
  - Live notifications
  - Real-time collaboration or chat
  - Live status updates or dashboards

- **File Handling and Processing**: Perform non-trivial server-side or client-side processing on uploaded files. Examples include:
  - Editing, transforming, or validating uploaded files
  - Parsing structured file formats (e.g., CSV, JSON, images, PDFs)
  - Generating derived files or previews
  - Applying business logic based on file contents

  Note: Simple file upload and download does **not** count as an advanced feature, as it is [part of the Core Technical Requirements](#data-storage-requirements-required-for-all-projects).

- **Advanced State Management**: Manage complex or shared state that cannot be handled cleanly with local component state alone. Examples include:
  - Global client-side state shared across many components
  - Derived or computed state with clear update logic
  - State synchronization across views or sessions

  Recommended tool: [Redux Toolkit](https://redux-toolkit.js.org/)

- **Integration with External APIs or Services**: Integrate meaningfully with **external systems** beyond your own backend. Examples include:
  - Third-party data APIs
  - External authentication or identity providers
  - Payment, messaging, or analytics services
  - Cloud-based AI or data-processing APIs

### Note on Project Requirements and Scope

<Callout type="error" emoji="❗">
  **Meeting the [Core Technical Requirements](#core-technical-requirements) is
  mandatory — no exceptions.** Projects must use the specified tools and
  technologies (including TypeScript, SQLite/PostgreSQL, and the required
  frontend frameworks) to align with course content and ensure fair grading and
  peer review. Alternative technology stacks, even if industry-standard, will
  not be accepted for this course project. However, within the required stack,
  students are encouraged to explore advanced features with any modern tools, as
  long as they are used with TypeScript and remain compatible with the core
  technical requirements.
</Callout>

Your project <span className="highlight-red-bold">MUST</span> implement all core technologies and at least two advanced features. To ensure a focused and achievable project within the ~2 month timeline, avoid the following scope pitfalls:

- **Too simple** (e.g., a basic CRUD app without meaningful features), which will not demonstrate sufficient mastery of course technologies
- **Too complex** (e.g., distributed systems or machine-learning-heavy features), which are difficult to implement effectively within the course timeline
- **Too broad** (e.g., a full-scale social media platform), which often leads to shallow or incomplete implementations

The **goal** is to develop a **well-scoped, thoughtfully implemented application** that effectively showcases your understanding of modern web development using the required technologies. A successful project should have a **clear purpose, achievable scope, and polished implementation of core features**.

Remember: A well-executed, focused project is far more valuable than an overly ambitious one that cannot be completed properly within the course timeline. While creativity and innovation are encouraged, please keep in mind that <span className="highlight-purple-bold">this is a course project with specific learning objectives to achieve.</span>

### Example Project Ideas

Below are some illustrative project ideas to guide your team. Smaller teams (2 members) may implement a subset of features, while larger teams (3–4 members) should aim for more features or added complexity.

These examples are **not** fixed blueprints. The listed technologies and features are suggestions to illustrate scope and complexity, **not** strict requirements.

Whether based on these examples or entirely original ideas, **all projects must fulfill the [Core Technical Requirements](#core-technical-requirements) and include [at least two advanced features](#advanced-features-must-implement-at-least-two)**.

Teams are encouraged to propose unique project ideas tailored to their interests and expertise, provided the scope is realistic and achievable within the project timeline.

1. **Collaborative Document Annotation Platform**

   A web application that allows users to upload documents (e.g., PDFs) and collaboratively annotate them in real-time.

   **Key feactures:**
   - User authentication and team management
   - Role-based permissions (Admin, Editor, Viewer)
   - Real-time collaborative annotations and comments
   - Annotation categorization and filtering
   - Document version history
   - Search functionality across documents and annotations
   - Email notifications for mentions and replies
   - Document preview with pagination
   - Export annotations in various formats
   - PostgreSQL for structured data
   - Cloud storage for document handling

2. **Personalized Learning Platform**

   A system where educators can create and share interactive educational content (e.g. videos and PDFs).

   **Key features:**
   - User authentication with different roles (Teacher, Student)
   - Course creation and management
   - Interactive content builder (quizzes, assignments)
   - Progress tracking and analytics dashboard
   - Discussion forums for each course
   - Assignment submission and grading
   - Calendar integration for deadlines
   - Certificate generation upon completion
   - PostgreSQL for structured data
   - Cloud storage for educational content

3. **Event Ticketing and QR Code Check-in System**

   A full-stack platform for event management and ticket processing.

   **Key feactures:**
   - User authentication (Organizer, Staff, Attendee)
   - Event creation with customizable registration forms
   - Tiered ticket pricing and discount codes
   - QR code generation and validation
   - Real-time check-in dashboard
   - Attendance analytics and reporting
   - Automated email confirmations
   - Waitlist management
   - Mobile-responsive check-in interface
   - PostgreSQL for transaction data
   - Cloud storage for event assets

4. **Online Code Collaboration Tool**

   A real-time coding environment where users can write and execute code collaboratively.

   **Key feactures:**
   - User authentication and workspace management
   - Real-time code editing
   - Basic syntax highlighting for 2-3 popular languages
   - Project organization (folders and files)
   - Team/group management
   - Chat functionality
   - Code snippet saving and sharing
   - Custom theme settings (light/dark mode)
   - PostgreSQL for user and project data
   - Cloud storage for code files

5. **Scientific Conference Management System**

   A simplified OpenReview clone for managing academic paper submissions and reviews, with different roles having distinct permissions and workflows.

   **Key features:**
   - Role-based access control (Author, Reviewer, Chair)
   - Paper submission system with metadata and PDF uploads
   - Double-blind review process
   - Review assignment and management
   - Discussion threads for each submission
   - Automated email notifications
   - Decision management and response periods
   - Conference timeline management
   - PostgreSQL for structured data
   - Cloud storage for paper submissions

6. **Collaborative Data Analysis Platform**

   A web-based platform where data scientists can upload datasets, create visualizations, and collaborate on analysis projects in real-time.

   **Key features:**
   - User authentication and team workspace management
   - Dataset upload and management (CSV, JSON, Excel)
   - Data visualization using existing libraries (e.g. [Chart.js](https://www.chartjs.org/))
   - Data table view with sorting and filtering
   - Dataset metadata management
   - Sharing permissions (public/private, team access)
   - Comments and annotations on visualizations
   - Export visualizations as images
   - PostgreSQL for metadata and user data
   - Cloud storage for dataset files

<Callout type="info">

**Clarification on Team Size and Grading**

Grading is consistent for all teams (2-4 students), with expectations scaled by team size. All teams must implement core technical requirements and at least two advanced features. Smaller teams (2 members) may use simpler implementations, while larger teams (3-4 members) should add complexity, as shown in [Example Project Ideas](#example-project-ideas).

Rubrics for the Project Proposal, Presentation, and Final Deliverable focus on quality and requirements, not team size. The [Project Completion rubric](#project-completion-30-out-of-20-points) adjusts code expectations: 1200+ lines per member (2-member teams), 1000+ (3-member teams), 800+ (4-member teams). [Individual contributions](#individual-contributions-20-out-of-20-points) are verified via GitHub commits to ensure fairness. More members mean more coordination, which balances workload across team sizes.

</Callout>

## Project Proposal

The project proposal should be submitted as a single file in the form of a [Markdown document](https://daringfireball.net/projects/markdown/) (with the `.md` suffix in the filename), with a maximum length of **2000 words**. Other formats (such as Microsoft Word or Adobe PDF) will not be accepted, as Markdown is the industry standard for technical documentation in software development. The project proposal should include the following five sections of the project, described clearly and concisely:

### Required Sections

#### 1. Motivation

- Identify the problem or need your project addresses
- Explain why this project is worth pursuing
- Describe the target users
- Optional: Discuss any existing solutions and their limitations

#### 2. Objective and Key Features

- Clear statement of project objectives
- Detailed description of core features, including:
  - Technical implementation approach (Next.js Full-Stack or Express.js Backend)
  - Database schema and relationships
  - File storage requirements
  - User interface and experience design
  - Planned advanced features (at least two)
- Explanation of how these features fulfill the course project requirements
- Discussion of project scope and feasibility within the timeframe

#### 3. Tentative Plan

- Describe how your team plans to achieve the project objectives over the next few weeks
- Provide a clear breakdown of responsibilities for each team member
- Outline the plan week-by-week, but you do not need to provide exact milestone dates as the duration of the project is short

#### 4. Initial Independent Reasoning (Before Using AI)

- Record your team's original thinking and plans **before consulting any AI tools**.
- Respond to the following prompts clearly and concisely:
  1. **Application structure and architecture**: Describe your team’s initial decisions about the overall structure of the application (e.g., Next.js full-stack vs. separate frontend and backend). Explain _why_ this structure felt appropriate for your project goals and team skills.
  2. **Data and state design**: Outline your early thinking about how data would be stored, accessed, and shared across the system. This may include database structure, client-side or server-side state management, and how different parts of the application were expected to interact.

  3. **Feature selection and scope decisions**: Explain how your team initially decided on the core features and advanced features to implement. What tradeoffs did you consider between ambition, complexity, and feasibility within the course timeline?

  4. **Anticipated challenges**: Identify the aspects of the project your team expected to be most challenging _before_ starting implementation (e.g., authentication flow, state synchronization, frontend–backend integration). Explain your reasoning.

  5. **Early collaboration plan**: Describe how responsibilities were initially expected to be divided among team members, and how your team planned to coordinate work during early development. Emphasize your rationale rather than a week-by-week plan.

This section should reflect **your team’s thinking at the start of the project**, not a retrospective justification. Clarity and authenticity matter more than completeness or technical sophistication.

#### 5. AI Assistance Disclosure

- Provide a brief reflection on how AI tools contributed to your proposal, if at all
- Answer the following prompts clearly and concisely:
  1. Which parts of the proposal were developed **without** AI assistance?
  2. If AI was used, what specific tasks or drafts did it help with?
  3. For one idea where AI input influenced your proposal, briefly explain:
     - what the AI suggested, and
     - what additional considerations, constraints, or tradeoffs your team discussed when deciding whether or how to adopt that suggestion.

### Marking Rubrics

#### Motivation: 28% (out of 10 Points)

- **10 Points**: The motivation is sufficiently convincing, with a clear problem statement and well-defined target users. The proposal demonstrates thoughtful consideration of why this project is worth pursuing and how it benefits its intended users.
- **6 Points**: The motivation is present but lacks conviction or clarity. The problem statement or target users are vaguely defined, making it difficult to understand the project's value.
- **0 Point**: The motivation section is missing or completely irrelevant to the project scope.

#### Objective and Key Features: 48% (out of 10 Points)

- **10 Points**: The project objectives are clearly and precisely defined. All core technical requirements are explicitly addressed. At least two advanced features are clearly specified. The proposed scope is realistic for the team size and timeline, demonstrating strong technical understanding and thoughtful feasibility analysis.
- **7 Points**: The project objectives and key features are mostly clear and cover all required components. Minor gaps, ambiguities, or over/under-scoping are present, but the overall plan is technically sound and feasible. Advanced features are identified but may lack some implementation detail or justification.
- **4 Points**: The objectives and features are present but lack clarity, completeness, or technical depth. One or more required components are insufficiently explained, weakly justified, or appear unrealistic for the timeline. The feasibility of the proposed scope is uncertain.
- **0 Point**: The objectives and features section is missing, fundamentally unclear, or fails to address the basic course project requirements.

#### Tentative Plan: 14% (out of 10 Points)

- **10 Points**: The plan is clear, realistic, and well structured. Team responsibilities are articulated, and a casual reader can reasonably believe the group can complete the project on time.
- **6 Points**: The plan is present but lacks clarity, structure, or feasibility. A casual reader may not be convinced the project can be completed.
- **0 Point**: The proposed plan is missing or incomprehensible.

#### Initial Independent Reasoning (Before Using AI): 5% (out of 10 Points)

- **10 Points**: Clearly and concisely documents the team’s genuine early reasoning _before_ using AI tools. The section explains initial decisions about application structure, data/state design, feature selection, anticipated challenges, and early collaboration plans. Reasoning is coherent, plausible, and consistent with the rest of the proposal.

- **6 Points**: Section is present but superficial, vague, or partially inconsistent with the proposal. Some aspects of early reasoning are mentioned, but explanations lack depth, clarity, or specificity, showing limited evidence of deliberate pre-AI thinking.

- **0 Point**: Section is missing, irrelevant, or reads as a retrospective justification written after AI usage (e.g., generic, or disconnected from the team’s stated design and scope).

#### AI Assistance Disclosure: 5% (out of 10 Points)

- **10 Points**: Clear, specific reflection that identifies where AI was or was not used, how AI contributed, and what human reasoning or tradeoff analysis complemented AI output.
- **6 Points**: Reflection is present but lacks specificity; overly generic; does not clearly distinguish human vs. AI contributions.
- **0 Point**: Missing, vague, or evidently AI-generated without genuine reflection.

<Callout type="info">

**Note on Grading Scale**

The rubric lists anchor scores (e.g., 10, 7, 6, 4, 0) to describe different performance levels. Intermediate scores (e.g., 8) may be awarded when appropriate.

Full marks (10/10) represent exceptional clarity, precision, and technical depth — not merely the absence of errors. Work that meets expectations clearly and correctly will typically fall within the solid (7–8) range.

</Callout>

### Submission

Submit a **single Markdown document** to the assignment labeled **Project Proposal** in the [Quercus course website](https://q.utoronto.ca/courses/419685/assignments/1664723) by **Monday, March 2, 2026, 11:59 PM**.

Each member of the team must make their own submission on Quercus. All members of the same team should submit the identical document.

<Callout type="info">

**Note on Images in the Proposal**

You may include images by embedding them using a **publicly accessible URL**, for example:

```markdown copy
![Image Name](https://example.com/image.png)
```

The image must:

- Be publicly accessible (no login required)
- Not require special permissions or access approval

Acceptable hosting options include:

- A public GitHub repository (using the image’s public URL)
- A public image hosting service (e.g., Imgur)
- Any other public URL that does not require authentication

If the image link requires login access (e.g., private repository or restricted Google Drive link), it will not be visible during grading.

For the **final project report**, images may be stored directly in your project repository, since the repository itself will be submitted for grading.

</Callout>

<Callout type="default">

**Note on Project Changes Post-Proposal**

You are allowed to modify your project idea, features, or scope after submitting the proposal (e.g., based on challenges, or new insights). We will not enforce consistency between the proposal and your final deliverables — each will be graded independently using the provided marking rubrics.

</Callout>

## Presentation

Each team will deliver a **6-minute presentation** during Lecture 10 (March 20, 2026) or Lecture 11 (March 27, 2026) to showcase the project’s features and technical implementation as completed by **March 19, 2026**.

Presentation slots have been randomly assigned and can be viewed here:

- [March 20 Slots](/lectures/lecture-10)
- [March 27 Slots](/lectures/lecture-11)

Teams may designate one or two members to present. However, **all team members must attend both sessions** to provide peer feedback. Exceptions will be granted only to part-time MEng students with unavoidable work conflicts.

<Callout type="info">
  For guidance on how to structure your presentation, design slides, manage
  timing, and deliver the presentation, see [Project Presentation
  Guidelines](/project/presentation/presentation-guidelines).
</Callout>

### Submission

- Submit a **written project introduction (70–100 words)** individually via [Quercus](https://q.utoronto.ca/courses/419685/assignments/1664835) by **Wednesday, March 18, 2026, 11:59 PM EST**.
  - This introduction is used to set up peer review forms and to publish a preview of projects on the course website.
  - During the presentation, teams are still expected to introduce the project themselves as part of the 6-minute time slot.
- Submit **presentation slides** individually via [Quercus](https://q.utoronto.ca/courses/419685/assignments/1664836) by **Thursday, March 19, 2026, 11:59 PM EST**.
  - All team members must upload the same file to ensure fairness.
  - During the presentation, teams are expected to use the same slides submitted to Quercus. Minor revisions such as typo fixes are acceptable, but no substantive content changes are allowed after March 19, 2026.

### Content Requirements

- **Core Requirements (Mandatory)**: Demonstrate all core technical requirements. At a minimum, your presentation should clearly show:
  - A working **frontend** implemented with React or Next.js (TypeScript)
  - A functioning **backend** (Next.js full-stack or Express.js)
  - Persistent data storage using **SQLite or PostgreSQL**
  - Basic **file handling** using **cloud storage**
  - Clear frontend–backend integration (API calls, data flow, state updates)

  A live demo is strongly encouraged.  
  Short recorded clips may be used as a backup for network-dependent components (see [Presentation Logistics](/project/presentation/presentation-logistics#live-demo-expectations)).

- **Advanced Features**: Present at least two advanced features.
  - If an advanced feature is already implemented: Briefly demonstrate it and clearly explain its purpose, design, and how it integrates with the rest of the application.

  - If an advanced feature is not yet implemented: Clearly explain the feature and its intended behavior, support the explanation with a diagram, mockup, example interaction, or partial implementation, and provide a clear, feasible milestone plan for completing the feature by the Final Project Deliverable deadline.

### Expectations

- **Scope and Fairness**: The presentation must showcase **only the work completed by March 19, 2026**.

  Development may continue after this date, but any new features or major changes completed after March 19 must **not** be included in the presentation.

- **Core Requirements**: All core requirements must be functional and demo-ready by March 19, either:
  - in a local development environment, or
  - in a deployed environment (if available)

  Note: Deployment is not required for this course project, but will be considered a [bonus](#bonus-points).

- **Advanced Features**: May still be in progress at the time of presentation, but teams must provide a clear, realistic explanation and a concrete completion plan.

- **Communication**: Presentations should be delivered without reading from a full script. Clear and direct oral communication is part of the evaluation. Detailed expectations are outlined in the [Project Presentation Guidelines](/project/presentation/presentation-guidelines#communication-expectations-delivery)

### Grading

- Worth 10% of final grade (5% peer, 5% instructor & TAs), evaluated using the [Presentation Rubric](/project/presentation/presentation-rubric).
- Peer scores are normalized across both presentation days for fairness.

## Final Project Deliverable

The final project deliverable should be submitted as a URL to a public or private GitHub repository. If your repository is private, add the instructor and TAs (GitHub usernames: `cying17`, `silviafeiwang`,
and `XindanZhang`) as collaborators so that it can be read.

Your repository must contain:

1. A final report (`README.md`)
2. Complete source code
3. An AI interaction record (`ai-session.md`)
4. A video demo
5. Deployment URL (if deployed)

### Final Report

A `README.md` file that contains the final report, in the form of a [Markdown document](https://daringfireball.net/projects/markdown/) of no more than 5000 words in total length [^1][^2]. If you wish to include images (such as screenshots) in the final report, make sure that it can be visible when the instructor and TAs visit your GitHub repository with a web browser.

The report should clearly and concisely cover the following aspects:

- **Team Information**: List the names, student numbers, and preferred email addresses of all team members. Make sure these email addresses are active as they may be used for clarification requests.
- **Motivation**: Explain why your team chose this project, the problem it addresses, and its significance.
- **Objectives**: State the project objectives and what your team aimed to achieve through the implementation.

- **Technical Stack**: Describe the technologies used, including the chosen approach (Next.js Full-Stack or Express.js Backend), database solution, and other key technologies.
- **Features**: Outline the main features of your application and explain how they fulfill the course project requirements and achieve your objectives.
- **User Guide**: Provide clear instructions for using each main feature, supported with screenshots where appropriate.
- **Development Guide**: Include steps to set up the development environment, covering
  - Environment setup and configuration
  - Database initialization
  - Cloud storage configuration
  - Local development and testing
- **Deployment Information** (if applicable): Provide the live URL of your application and relevant deployment platform details.
- **AI Assistance & Verification (Summary)**: If AI tools contributed to your project, provide a concise, high-level summary demonstrating that your team:
  - Understands where and why AI tools were used
  - Can evaluate AI output critically
  - Verified correctness through technical means

  Specifically, briefly address:
  - Where AI meaningfully contributed (e.g.,architecture exploration, database queries, debugging, documentation)
  - One representative mistake or limitation in AI output (details should be documented in `ai-session.md`)
  - How correctness was verified (e.g., manual testing of user flows, logs, unit or integration tests)

  Do **not** repeat full AI prompts or responses here. Instead, reference your `ai-session.md` file for concrete examples.

- **Individual Contributions**: Describe the specific contributions of each team member, aligning with Git commit history.
- **Lessons Learned and Concluding Remarks**: Share insights gained during development and any final reflections on the project experience.

### Source Code

Your repository must contain all source code required to build and run the project. This includes the complete implementation of both frontend and backend components, along with necessary configuration files. The source code should be well-organized in a logical directory structure, following standard practices for your chosen tech stack (Next.js or Express.js).

Required components include:

- All application source files
- Environment configuration templates
- Database schema definitions and migrations
- Essential documentation (such as API endpoints)
- Testing files (if implemented)

Make sure your repository includes clear instructions in the development guide section of your `README.md` for setting up and running the project locally. Any environment variables or sensitive credentials should be properly documented but not committed to the repository. If your project requires specific configuration for cloud services or external APIs, provide clear setup instructions or template files.

Your code should follow consistent formatting and include appropriate comments for complex logic. Consider including a `.gitignore` file to exclude unnecessary files and dependencies from version control.

<Callout type="info">

If your project requires sensitive credentials (e.g., API keys, database credentials) for execution, submit them in a password-protected `.zip` or `.tar.gz` file via email to TA Yiren Zhao: [yiren.zhao@mail.utoronto.ca](mailto:yiren.zhao@mail.utoronto.ca)

Send the password in a separate email to the TA. Both emails must be sent **by the final deliverable deadline**. Each team only needs to complete this step once.

In your Development Guide section of your final report (the `README.md` file), clearly state "Credentials sent to TA".

</Callout>

### AI Interaction Record

Your repository must include a file named `ai-session.md` to provides concrete evidence supporting the AI Assistance & Verification section in `README.md`.

The `ai-session.md` file documents **1–3 representative AI interactions** that meaningfully influenced the project. These interactions should demonstrate:

- Responsible and transparent use of AI tools
- Your team's ability to critically evaluate AI output
- How AI-generated suggestions were validated, adapted, or corrected in the context of your application

For each interaction, include:

```md filename="ai-session.md" copy
## Session Title (e.g., Diagnosing unexpected UI behavior)

### Prompt (you sent to AI)

<copy/paste>

### AI Response (trimmed if long)

<copy/paste or summary>

### What Your Team Did With It

1-3 bullet points describing:

- What was useful
- What was incorrect, misleading, or not applicable to your project
- How your team verified, modified, or replaced the suggestion
```

There is no word limit for this file.

You do not need to include every AI interaction.
Choose examples that best demonstrate judgment, correction, and verification, not trivial edits or formatting help.

### Video Demo

Include a 1–5 minute video demo, showcasing:

- Key features in action
- User flow through the application
- Technical highlights
- Deployment (if applicable)

The video's URL must be included in the `## Video Demo` section of the final report (the `README.md` file). Host the video on a platform like YouTube, Dropbox, or Google Drive, ensuring access for the instructor and TAs. If under 100 MB, the video may be included directly in the GitHub repository.

### Marking Rubrics

#### Technical Implementation: 30% (out of 20 Points)

To be marked by reading the final report `README.md`, reviewing source code, and testing the application functionality.

- **20 Points**: Complete and correct implementation of all required technologies
  - TypeScript
  - Frontend (Next.js/React, Tailwind CSS, shadcn/ui)
  - Backend (Next.js/Express.js)
  - Database operations
  - Cloud storage functionality
- **15 Points**: Implementation is largely correct, with minor issues or weaknesses in one or two areas.
- **10 Points**: Basic implementation is present, but multiple components have noticeable issues or limitations.
- **5 Points**: Major issues exist in the implementation, significantly affecting correctness or functionality.
- **0 Points**: Missing critical technical components.

#### Project Completion: 30% (out of 20 Points)

To be marked by reading the final report `README.md`, reviewing source code, and watching the video demo.

- **20 Points**: All proposed features working correctly with clear user flow. Meets minimum lines of meaningful code (excluding comments, `node_modules`, generated files, etc.) per member: 1200+ (2 members), 1000+ (3 members), or 800+ (4 members).
- **15 Points**: Most features working as intended. Lines of meaningful code per member: 800-1200 (2 members), 700-1000 (3 members), or 600-800 (4 members).
- **10 Points**: Basic features implemented. Lines of meaningful code per member: 400-800 (2 members), 300-700 (3 members), or 300-600 (4 members).
- **5 Points**: Features are significantly unfinished, or lines of meaningful code fall below the minimum threshold for the team size.
- **0 Points**: Minimal working functionality or insufficient code contribution.

<Callout type="info">
  Lines of code (LOC) will be counted using
  [cloc](https://github.com/AlDanial/cloc), excluding comments, `node_modules`,
  generated files, and non-source files such as configuration and dependency
  files.
</Callout>

#### Documentation and Code Quality: 15% (out of 20 Points)

To be evaluated by reading the final report (`README.md`) and reviewing code organization.

- **20 Points**: Comprehensive and well-structured `README.md` with clear setup instructions, a well-organized codebase, consistent coding style, and regular, meaningful Git commits.
- **15 Points**: Good documentation overall, with minor gaps in clarity, structure, or consistency.
- **10 Points**: Basic documentation is present but lacks essential details, or the codebase shows inconsistent organization or style.
- **5 Points**: Documentation is incomplete or unclear, or the codebase is poorly organized or difficult to follow.
- **0 Points**: Documentation is missing or the codebase is chaotic and unreadable.

#### AI Reflection Quality: 5% (out of 20 Points)

- **20 Points**: Clear, specific, and technically grounded explanation of where AI contributed, including at least one incorrect, incomplete, or suboptimal AI output, how it was identified, and how correctness was verified. Demonstrates strong understanding of the application’s design and implementation.
- **10 Points**: Reflection is present but lacks technical depth or specificity. AI contributions are described at a high level, with limited discussion of errors, limitations, or verification. Evidence of human judgment and validation is present but incomplete or weak.
- **0 Point**: Reflection is missing, superficial, or reads as generic or AI-generated without evidence of genuine understanding, critical evaluation, or technical verification.

#### Individual Contributions: 20% (out of 20 Points)

Individual marks will be assigned to each team member based on reading the final report `README.md` and reading the commit messages in the commit history in the GitHub repository.

- **20 Points**: The team member has made a fair amount of contributions to the project, without these contributions the project cannot be successfully completed on time.
- **15 Points**: The team member has made less than a fair amount of contributions to the project, _or_ without these contributions the project can still be successfully completed on time.
- **5 Points**: The team member has made less than a fair amount of contributions to the project, _and_ without these contributions the project can still be successfully completed on time.
- **0 Point**: The team member has not made any contributions to the project.

#### Bonus Points

Bonus points are awarded for clearly exceeding the course project requirements. Each of the following achievements earns 2% bonus points toward the Final Project Deliverable grade, up to a maximum of 6% total.

- **Deployed Application**: A successfully deployed and publicly accessible application, with a working URL provided in the final report.

- **Notable Technical Innovation**: A clearly identifiable technical or design innovation that goes beyond the stated course requirements and is substantive, not cosmetic. Examples include (but are not limited to):
  - A non-trivial architectural improvement or abstraction
  - Meaningful performance optimization or scalability consideration
  - A thoughtfully designed system feature not covered in lectures

  The innovation must be clearly explained in the final report, including
  motivation and impact.

- **High-Quality Open Source Project**: The project is released as a public open-source repository and meets all of the following criteria:
  - Clear contribution guidelines
  - Well-documented APIs or components
  - Detailed installation and setup instructions
  - An MIT or similar permissive open-source license
  - A professional, well-structured `README.md`

**Note**: Bonus points are intended to recognize exceptional work that goes
beyond course expectations. They do not compensate for missing core or
advanced requirements.

### Submission

Submit a single URL — the URL to your team's GitHub repository — to the assignment labeled **Final Project Deliverable** in the [Quercus course website](https://q.utoronto.ca/courses/419685/assignments/1664837). Each member of the team should make their own submission, but obviously all members in the same team should submit the same URL.

<Callout type="warning">
  The deadline for the course project is **Friday, April 3, 2026**, at **11:59
  PM** Eastern time, and late submissions will **NOT** be accepted. Do remember
  to add the instructor and TAs (GitHub usernames: `cying17`, `silviafeiwang`,
  and `XindanZhang`) as collaborators to the GitHub repository, if it is
  private, **before** the deadline.
</Callout>

[^1]: There is no minimum length requirement for the final report in `README.md`. Other formats (such as Microsoft Word or Adobe PDF) will not be accepted, as Markdown is the standard documentation format in software development.

[^2]: You may reuse relevant content from your project proposal where appropriate.

## Tips and Suggestions

### Using GitHub for Project Management and Effective Collaboration

Effective teamwork depends on efficient communication and collaboration, often more so than completing individual tasks. To streamline your team’s workflow, I highly recommend using **GitHub** as your central collaboration hub. Treat your GitHub repository as your team’s central workspace — it’s not just for code storage but also a powerful tool for organizing and managing your entire project. Here’s how to leverage its full functionality:

- **Commit Frequently with Meaningful Messages**: Keep commits small and [use a consistent format](/resources/github-usage#commit-message-format) (e.g., `fix: ...`, `feat(api): ...`). This helps your team and also supports fair evaluation of individual contributions.
- **Use Branches and Pull Requests**: Create a new branch for each feature or task. Once the feature is complete, submit a pull request for review. This ensures code quality, facilitates collaboration, and makes it easier to integrate changes.
- **Use GitHub Issues for Task Management**: Create GitHub Issues to maintain a “to-do” list of outstanding tasks. Assign issues to team members, add labels for priority or category, and close them once completed. This keeps your workflow organized and transparent.
- **Leverage GitHub Discussions for Communication**: Use GitHub Discussions to document all team conversations, decisions, and brainstorming sessions. This ensures that nothing gets lost, and you can always refer back to previous discussions if needed.
- **Document Everything in the GitHub Wiki**: Use the GitHub Wiki as your project journal to record major decisions, challenges, and solutions. This creates a valuable reference for your team and anyone who might review your project in the future.

Check [this page](/resources/github-usage) for a step-by-step guide on using GitHub to manage tasks and collaborate effectively.

---