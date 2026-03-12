**Platform Actors and Their Roles:**

### **1. Platform Owner (Super Admin)**

**Overview:**
The owner and operator of the **UniBot** system (the Lessor). They hold absolute authority over the system infrastructure, servers, and central databases. They do not interfere in the internal academic affairs of universities but focus on service continuity, subscription management, and technical system maintenance.

#### **I. Detailed Responsibilities and Tasks**

1.  **Tenant Management:**
    *   **Provisioning:** Creating a new workspace (Instance) for each subscribing university and allocating an isolated database or schema.
    *   **Status Management:** Activating, suspending, or fully deleting university accounts (in cases of non-payment or contract expiration).
    *   **Resource Management:** Defining storage quotas and the number of allowed users for each university based on their subscription plan.

2.  **Subscription & Billing Management:**
    *   Defining subscription plans (Basic, Pro, Enterprise) and the features included in each.
    *   Monitoring contract renewal dates and sending automated invoices to universities.
    *   Managing electronic payment gateways to receive subscription fees from universities.

3.  **System Health & Maintenance:**
    *   Monitoring server performance (CPU, RAM usage) to ensure zero downtime.
    *   Managing global backups for all universities for disaster recovery.
    *   Deploying software updates and patches across all universities simultaneously.

4.  **Global AI Configuration:**
    *   Managing and updating the "Base Model" (LLM) used by all universities.
    *   Monitoring AI token consumption and API costs for each university.

5.  **Other Key Features:**
    *   **God View Dashboard:** A control panel providing a live map of all connected universities and their real-time activity status.
    *   **Global Ticketing System:** Receiving technical failure reports directly from "University Admins" within the dashboard.
    *   **Security & Compliance Management:** Utilizing tools for a complete "Data Wipe" of a specific university’s data upon legal contract termination.
    *   **API Gateway Management:** Controlling the data transfer rate (Rate Limiting) for each university to prevent resource exhaustion (DDoS protection).
    *   **Security Audit Logs:** Monitoring server-level breach attempts or unauthorized access.

#### **II. Permissions**
*   Full access to all "Platform Management" dashboards.
*   The authority to log in as a "University Admin" (Impersonation) for technical support purposes only.
*   No authority to access sensitive academic data (student grades, private messages) except through formal requests and security auditing.

#### **III. Subsystem Interactions**
*   **Platform Management System:** The primary user of this system.
*   **Reporting System:** Accesses financial and technical performance reports for the entire platform.

---

### **2. University Admin (Tenant Admin)**

**Overview:**
The primary technical officer within the university (the Tenant). Appointed by the university to manage their specific instance of **UniBot**. They hold the keys to university settings and academic structure and are responsible for configuring the environment for faculty and students.

#### **I. Detailed Responsibilities and Tasks**

1.  **General Configuration:**
    *   **Branding:** Uploading the university logo, changing interface theme colors, and customizing the welcome message.
    *   **Academic Calendar:** Setting start/end dates for semesters, official holidays, and registration/add-drop periods.
    *   **Localization:** Configuring regional settings, language, and timezones.

2.  **Academic Structure Management:**
    *   **Colleges & Departments:** Building the organizational tree (e.g., Engineering -> Computer Dept / Civil Dept).
    *   **Programs & Majors:** Defining majors (e.g., BSc in Cybersecurity) and linking them to departments.
    *   **Levels & Plans:** Creating academic levels (1 to 10) and defining courses (Codes, Names, Credits).

3.  **User & Role Management:**
    *   **Bulk Import:** Uploading Excel/CSV files containing data for thousands of students and faculty to create accounts in batches.
    *   **Role-Based Access Control (RBAC):** Creating custom roles (e.g., Registrar, Dept Head, Exam Proctor) with granular permissions.
    *   **Account Management:** Activating, suspending, or resetting user passwords.

4.  **Scheduling & Resource Management:**
    *   **Venue Definition:** Entering data for classrooms, labs, and their capacities.
    *   **Schedule Oversight:** Supervising the creation of the general academic schedule.

5.  **Chatbot Configuration:**
    *   **Knowledge Base Feeding:** Uploading university regulations (Student Handbook, Disciplinary Code, Academic Bylaws) for the bot to index and use for responses.

6.  **Other Key Features:**
    *   **Audit Logs:** Reviewing "who did what and when" (e.g., who modified student X's grade) to ensure integrity.
    *   **Data Cleaning Tool:** Identifying duplicate accounts or graduated students for archiving and database optimization.
    *   **Communication Management:** Sending "Global Circulars" that appear in the notification panels of all university members.

#### **II. Subsystem Interactions**
*   **Tenant Management System:** Configures university-specific settings.
*   **Academic Affairs System:** Builds the foundational structure for system operations.
*   **Messaging System:** Audits reported conversation logs (only in cases of violations).
*   **Reporting System:** Accesses comprehensive usage reports (active students, high-engagement courses).

---

### **3. Academic Management**
**(Deans, Department Heads, Program Coordinators)**

**Overview:**
Responsible for managing daily educational operations within a specific scope (College or Department). In the multi-tenant UniBot system, they hold "supervisory" and operational permissions only for their entities. They act as the link between strategic planning (University Admin) and field execution (Faculty).

#### **I. Detailed Responsibilities and Tasks**

1.  **Curriculum & Workload Management:**
    *   **Course Management:** Reviewing and approving course syllabi uploaded by instructors.
    *   **Workload Distribution:** Assigning instructors to courses and sections for each semester.
    *   **Section Management:** Opening/closing sections, setting enrollment caps, and merging sections.
    *   **Prerequisite Linking:** Ensuring courses meet major requirements and building "Model Study Plans."

2.  **Scheduling Management:**
    *   **Schedule Construction:** Creating the semester schedule, distributing lectures across venues (to prevent spatial conflict), and setting times (to prevent student-level conflicts).
    *   **Exam Management:** Scheduling midterms/finals and assigning invigilators.
    *   **Publishing:** Approving and publishing the final schedule to student and faculty portals.

3.  **Monitoring & Supervision:**
    *   **Attendance Monitoring:** Reviewing reports on faculty lecture adherence and student absence rates.
    *   **Process Tracking:** Ensuring instructors upload required content and post grades on time.
    *   **Academic Accreditation:** Extracting performance reports (KPIs/CLOs) for quality and accreditation purposes.

4.  **Communication & Decision Support:**
    *   **Targeted Circulars:** Sending alerts to specific groups (e.g., department students or a specific level).
    *   **Student Issue Resolution:** Processing complex requests (e.g., re-enrollment, medical excuses, grade appeals) via the ticketing system.
    *   **Predictive Analysis:** Receiving alerts regarding "courses with high predicted failure rates" or "at-risk students" for proactive intervention.

5.  **Other Key Features:**
    *   **Smart Conflict Detector:** Instant alerts when scheduling overlapping sessions for rooms or instructors.
    *   **Department Pulse:** A real-time summary dashboard (Current live lectures, daily absences, submitted assignments).
    *   **Approval Workflows:** A systematic workflow for approving grade changes, schedule adjustments, or excuse acceptances within the ticketing module.

#### **II. Subsystem Interactions**
*   **Academic Affairs System:** Their primary tool for scheduling and distribution.
*   **Messaging System:** For official communication with faculty.
*   **Analytics System:** Monitoring department-specific dashboards.

---

### **4. Faculty Members / Instructors**
**(Professors, Lecturers, TAs)**

**Overview:**
The primary operators of the Learning Management System (LMS) and messaging system. In UniBot, they are "Knowledge Managers" who feed the AI assistant with content, lead channel interactions, and evaluate student performance based on system analytics.

#### **I. Detailed Responsibilities and Tasks**

1.  **Course Content Management:**
    *   **Educational Material Upload:** Uploading lectures (Video, PDF, Slides) with precise naming for UniBot indexing.
    *   **Syllabus Management:** Defining weekly topics and linking them to dates.

2.  **Assessment & Grading:**
    *   **Assignment Creation:** Defining types, deadlines, and submission mechanisms.
    *   **Grading:** Manually or automatically correcting assignments and recording grades.
    *   **Attendance Management:** Activating "Smart Attendance" (QR Code or Geolocation) and manually modifying attendance status with excuses.

3.  **Interaction & Messaging:**
    *   **Course Channel Admin:** Acting as the Admin for the course group channel (pinning messages, deleting inappropriate content, or setting to read-only).
    *   **Virtual Office Hours:** Setting "Online" times for immediate response to direct student messages.
    *   **Query Response:** Interacting with student questions or directing them to UniBot for content-based queries.

4.  **Monitoring & Advising:**
    *   **Risk Zone Dashboard:** Viewing lists of students categorized as "At-Risk" due to high absences or low grades.
    *   **Recommendations:** Sending personalized academic recommendations to specific students.

5.  **Other Key Features:**
    *   **Do Not Disturb (DND) Mode:** A toggle to stop notifications outside working hours with automated replies.
    *   **Alumni Status:** Managing the transition of students to "Alumni" status upon graduation with limited platform access (e.g., requesting documents).
    *   **AI Data Feeding (Tagging & Approval):** Tagging uploaded files as "AI-Approved." UniBot will not use any file unless specifically approved by the instructor to ensure data accuracy and IP protection.

#### **II. Subsystem Interactions**
*   **LMS System:** Uploading content, attendance, and grades.
*   **Messaging System:** Intensive communication (Public/Private).
*   **Chatbot:** Acting as the primary data feeder for the AI.
*   **Analytics System:** Monitoring section performance.

---

### **5. Students**

**Overview:**
The primary beneficiary and activity driver. In UniBot, the student is an active user interacting with a personalized, smart learning platform. Their experience focuses on "Ease," "Customization," and "Instant Support," reducing system fragmentation so they can focus on academic achievement with a 24/7 "AI Companion."

#### **I. Detailed Responsibilities and Tasks**

1.  **Learning Management & Content Access:**
    *   **Interactive Schedule:** Viewing an updated daily/weekly schedule with direct links to virtual halls or physical room numbers.
    *   **Course Content:** Accessing materials organized by week and watching missed lecture recordings.
    *   **Assignments & Exams:** Receiving notifications for due dates, uploading solutions, and performing electronic quizzes or exams within the system.
    *   **Grade Tracking:** Viewing detailed grade reports (coursework, midterms, finals) once published.

2.  **Engagement & Interaction:**
    *   **Direct Messaging:** Private communication with instructors during office hours and collaborating with peers within sections.
    *   **Course Channels:** Participating in discussions, responding to polls (e.g., regarding exam dates), and sharing useful links.
    *   **Attendance:** Self check-in via Geolocation or QR scanning and monitoring absence percentages to avoid dismissal.

3.  **UniBot AI Interaction:**
    *   **Academic Queries:** Asking the bot for scientific explanations (e.g., "Explain relational databases from Lecture 5"). The bot searches files and directs the student to the specific video minute or PDF page.
    *   **Administrative Queries:** Asking the bot about registration dates, GPA calculation, or university bylaws.
    *   **Personal Task Management:** Requesting reminders (e.g., "Remind me of the assignment tomorrow at 5 PM") or weekly task summaries.

4.  **Guidance & Recommendations:**
    *   **Smart Recommendations:** Receiving suggestions based on performance (e.g., "Your first exam score was low; we suggest reviewing these additional videos").
    *   **Early Warnings:** Receiving alerts for low GPA or approaching absence limits.

5.  **Other Key Features:**
    *   **My Progress Path:** A visual bar showing progress toward graduation requirements (remaining hours/elective courses).
    *   **Virtual GPA Calculator:** Experimenting with grade scenarios (e.g., "What if I get an A in this course?") to see the impact on cumulative GPA.
    *   **Dark/Focus Mode:** Customizing the interface to reduce eye strain or hide distractions during study sessions.

#### **II. Subsystem Interactions**
*   **LMS System:** Their primary interface for studying.
*   **Messaging System:** Their tool for social and academic communication.
*   **UniBot:** Their personal companion for answers and guidance.
*   **Schedules & Attendance:** For time management and commitment tracking.