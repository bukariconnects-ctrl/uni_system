### **Requirements Specification**

### **Phase 1: Requirements Identification**

#### **1. Level One: User Requirement - General Objective**
"To create an independent, smart, cloud-based academic platform operating on a Software-as-a-Service (SaaS) and Multi-tenancy architecture. The platform aims to provide universities with a secure and isolated digital environment that integrates Academic Affairs Management, Learning Management Systems (LMS), and effective communication channels. It features the deployment of Artificial Intelligence (AI) and Natural Language Processing (NLP) to provide a smart virtual assistant (UniBot) and a predictive analytics system. This transforms static academic data into an interactive, proactive, and personalized educational experience, serving administration, faculty, and students efficiently through a single centralized interface."

---

#### **2. Level Two: System Requirements (SR) - Core Capabilities**
Based on the general objective and defined subsystems, the system (UniBot Platform) must provide the following core capabilities:

*   **SR-1 (Platform & Tenant Management):** The system shall provide a multi-tenant cloud infrastructure allowing the platform owner to create and manage multiple university subscriptions, ensuring total Data Isolation and providing tools for University Admins to independently customize branding, subdomains, and regional settings.
*   **SR-2 (Academic Affairs & Structuring):** The system shall include an integrated administrative engine allowing academic management to build the university’s organizational tree (colleges, departments, majors), define levels and semesters, construct study plans linked to prerequisites, and generate schedules with automated conflict resolution for venues and faculty.
*   **SR-3 (LMS & Attendance Management):** The system shall provide an interactive learning environment for faculty to upload and manage digital content (Video, PDF, Audio), track student attendance (manually or automatically) with automated enforcement of "denial of entry" (dismissal) regulations, manage assignments, and maintain electronic gradebooks for coursework and exams.
*   **SR-4 (Messaging & Interactions):** The system shall feature a secure internal communication system supporting direct messaging (student-to-teacher, student-to-student within guidelines) and group messaging via auto-generated channels for each course, with secure file sharing (excluding executables) and faculty-controlled posting permissions.
*   **SR-5 (Smart Circulars & Notifications):** The system shall provide a smart information broadcasting engine allowing academic administration to send targeted official circulars to specific groups (e.g., a specific department, level, or section), with instant automated alerts for urgent changes like lecture cancellations or room reassignments.
*   **SR-6 (Smart Virtual Assistant - UniBot):** The system shall integrate an AI agent (Chatbot) supporting Arabic, working 24/7 to answer administrative inquiries (based on uploaded university regulations) and academic queries via semantic search within lecture content previously approved by instructors as "AI-verified."
*   **SR-7 (Predictive Analytics & Decision Support):** The system shall contain an AI data analysis engine that monitors student behavior, grades, and attendance rates to provide early predictions of academic struggle, issuing automated alerts and recommendations for faculty and administration intervention, alongside executive dashboards.
*   **SR-8 (Academic Ticketing System):** The system shall provide a per-university internal ticketing module allowing students and faculty to submit academic requests, complaints, and appeals. These are automatically routed to the relevant academic office for processing and tracking, with the AI assistant attempting to provide instant solutions before final ticket submission.

---

### **Level Three: Functional Requirements (FR)**

#### **Section 1: Platform Owner (Super Admin - SA)**
This section covers functional requirements for the entity owning the UniBot system, controlling infrastructure, tenant management, and central security without interfering in internal academic operations.

**FR-SA1: Tenant Management**
*   **FR-SA1.1 Provisioning:** The system shall allow the Super Admin to create a new workspace (Instance) for a tenant university, requiring at minimum: University name, desired Subdomain, Tenant Admin email, and Subscription plan. The system must automatically provision a fully isolated database/schema upon approval.
*   **FR-SA1.2 Domain Mapping:** The system shall allow the Super Admin to map and activate custom subdomains (e.g., university.unibot.com) for each tenant to ensure independent access.
*   **FR-SA1.3 Tenant Status Management:** The system shall provide controls to change a university's account status (Active, Suspend, or Delete), automatically blocking access and displaying an administrative message for suspended users.
*   **FR-SA1.4 Resource Quota Management:** The system shall allow the Super Admin to set and modify resource caps for each tenant, including maximum cloud storage and maximum active user limits.

**FR-SA2: Subscription & Billing**
*   **FR-SA2.1 Subscription Plan Definition:** The system shall allow the Super Admin to create/modify subscription plans (e.g., Basic, Pro, Enterprise), defining available features and pricing for each.
*   **FR-SA2.2 Contract Monitoring & Renewal:** The system shall automatically track subscription start/end dates and generate/send automated renewal invoices to Tenant Admins prior to expiration.
*   **FR-SA2.3 Centralized Payment Gateways:** The system shall allow the Super Admin to configure electronic payment gateways exclusively for receiving subscription fees from tenant universities.

**FR-SA3: System Health & Maintenance**
*   **FR-SA3.1 Global View Dashboard:** Upon login, the system shall display a central dashboard for the Super Admin providing live insights into: number of active/suspended universities, server resource consumption (CPU, RAM), and storage usage per tenant.
*   **FR-SA3.2 Global Backups:** The system shall allow the Super Admin to schedule and manage central backups for all tenant databases, with the option to restore specific university data in case of technical disasters.
*   **FR-SA3.3 Software Updates & Patches:** The system shall provide a mechanism to push software updates or security patches programmatically across all tenant workspaces simultaneously.
*   **FR-SA3.4 System-wide Announcements:** The system shall allow the Super Admin to send maintenance notices or alerts that appear in the dashboards of all Tenant Admins.

**FR-SA4: Global AI Configuration**
*   **FR-SA4.1 Base Model Management:** The system shall allow the Super Admin to define, update, or switch the Large Language Model (LLM) API used by the platform for the UniBot assistant.
*   **FR-SA4.2 AI Consumption Monitoring:** The system shall provide detailed reports on Token usage and API costs for each tenant for billing or throttling purposes.

**FR-SA5: Security & Compliance**
*   **FR-SA5.1 Legal Data Wipe:** Upon contract termination, the system shall provide a tool for the secure "Hard Delete" of all tenant data and knowledge bases to ensure compliance with data privacy laws.
*   **FR-SA5.2 Rate Limiting:** The system shall automatically apply request rate limits per tenant to prevent resource exhaustion (DDoS protection), with manual adjustment capabilities for the Super Admin.
*   **FR-SA5.3 Impersonation (Support Mode):** For technical support purposes only, the system shall allow the Super Admin to log into a tenant’s workspace as a "Tenant Admin," with all actions being logged in a non-editable Audit Log.
*   **FR-SA5.4 Privacy Constraint:** The system shall restrict the Super Admin from accessing sensitive academic data (e.g., student grades, lecture content, tickets, private messages) through the central dashboard.

---

#### **Section 2: University System Administrator (Tenant Admin - TA)**
This section covers requirements for the primary technical officer within the tenant university, responsible for managing university settings, academic structure, and users.

**FR-TA1: General Configuration**
*   **FR-TA1.1 Branding:** The system shall allow the TA to upload the university logo, define theme colors, and customize the login page welcome message.
*   **FR-TA1.2 Academic Calendar Setup:** The system shall provide an interface to set key dates: semester start/end, registration/add-drop periods, holidays, and the absence percentage threshold for dismissal (e.g., 25%).
*   **FR-TA1.3 Localization:** The system shall allow the TA to set the university’s timezone (for accurate lecture/deadline timing) and the default interface language.
*   **FR-TA1.4 Semester Archiving:** The system shall provide a "Semester End" function that automatically freezes grade entry, moves current sections to "Archive," and promotes students to the next level, maintaining read-only access to past data.

**FR-TA2: Academic Structure Management**
*   **FR-TA2.1 Organizational Tree Construction:** The system shall provide a tool to build the university hierarchy (Colleges -> Departments -> Majors/Programs).
*   **FR-TA2.2 Level & Semester Management:** The system shall allow the TA to define academic levels and divide them into semesters for different majors.
*   **FR-TA2.3 Course Catalog Definition:** The system shall allow the TA to add courses to the database, requiring: Course code, name, credit hours, and type (Theoretical/Practical).
*   **FR-TA2.4 Study Plan Construction:** The system shall allow the TA to link courses to academic levels per major and define "Prerequisites," which the system will use to block students from registering for courses without passing required prep-work.

**FR-TA3: User & Role Management**
*   **FR-TA3.1 Bulk Import:** The system shall allow the TA to upload Excel/CSV files to create thousands of student and faculty accounts, automatically generating initial passwords and assigning them to departments/levels.
*   **FR-TA3.2 Role-Based Access Control (RBAC):** The system shall allow the TA to create custom roles (e.g., Dean, Dept Head, Registrar) with granular permissions, restricted by scope (e.g., a Dept Head only manages the "Computer Dept").
*   **FR-TA3.3 Account Status Management:** The system shall allow the TA to search for any user to modify data, change account status (Active, Suspend, Terminate), or reset passwords.
*   **FR-TA3.4 Manual Registration:** The system shall allow the TA to manually register student and faculty data as an alternative to bulk importing.

**FR-TA4: Resource Management**
*   **FR-TA4.1 Venue & Lab Definition:** The system shall allow the TA to input spatial infrastructure data: Room name/number, type (Lecture Hall or Lab), and maximum capacity for use in conflict-free scheduling.

**FR-TA5: Chatbot Configuration**
*   **FR-TA5.1 Knowledge Base Feeding:** The system shall provide an interface for the TA to upload official documents (PDF/Text) such as Student Handbooks and Academic Regulations to serve as the exclusive reference for UniBot.
*   **FR-TA5.2 Knowledge Updates:** The system shall allow the TA to delete or replace old regulations, ensuring the AI assistant immediately stops using outdated information.

**FR-TA6: Communication, Auditing, & Maintenance**
*   **FR-TA6.1 Global Circulars:** The system shall allow the TA to draft and send "Global Circulars" appearing as mandatory notifications or banners for all university users.
*   **FR-TA6.2 Audit Logs:** The system shall provide a read-only security log showing all sensitive actions (e.g., grade modification, permission changes, file deletion) with User ID, Action, Timestamp, and IP address.
*   **FR-TA6.3 Data Cleaning Tool:** The system shall provide tools to detect duplicate accounts or identify students who have exceeded the maximum allowed semesters for graduation to facilitate archiving.


---

#### **Section 3: Academic Management (AM)**

This section covers functional requirements that enable academic leadership to plan semesters, manage schedules, monitor the educational process, handle academic tickets, and make data-driven decisions based on predictive analytics.

**FR-AM1: Curriculum & Workload Management**
*   **FR-AM1.1 Syllabus Approval:** The system shall allow academic management to review and approve course syllabi uploaded and proposed by faculty members before the start of the semester.
*   **FR-AM1.2 Teaching Workload Assignment:** The system shall provide an interface for academic management to assign and link faculty members to courses and open sections for each semester.
*   **FR-AM1.3 Course Section Management:** The system shall grant academic management full control over course sections, including: opening/closing sections, setting maximum enrollment capacities, and merging two or more sections when necessary.
*   **FR-AM1.4 Registration Period Configuration:** The system shall allow academic management to define registration rules for each semester (e.g., minimum/maximum credit hours per student, and enabling/disabling student self-registration).
*   **FR-AM1.5 Batch Enrollment:** The system shall provide a tool for academic management to enroll groups of students simultaneously into specific courses (based on their academic level or major) to ensure the placement of new students.

**FR-AM2: Scheduling Management**
*   **FR-AM2.1 Schedule Construction:** The system shall allow academic management to create the semester schedule by distributing lectures across weekdays, defining start/end times, and linking them to available venues and faculty.
*   **FR-AM2.2 Smart Conflict Detector:** Upon saving a schedule, the system shall automatically detect and prevent conflicts, including:
    *   **Spatial Conflict:** Booking the same room for more than one lecture at the same time.
    *   **Faculty Conflict:** Scheduling two lectures for the same instructor at the same time.
    *   **Student Conflict:** Scheduling two core (mandatory) courses for the same academic level at the same time.
*   **FR-AM2.3 Schedule Publishing:** The system shall allow academic management to "Approve and Publish" the final schedule, automatically reflecting it in the portals of the respective students and faculty members.

**FR-AM3: Monitoring & Supervision**
*   **FR-AM3.1 Department Pulse Dashboard:** The system shall provide academic management with a live dashboard displaying a summary of: ongoing lectures, daily student attendance statistics, and the number of assignments/tasks submitted that day.
*   **FR-AM3.2 Faculty Compliance Monitoring:** The system shall allow academic management to generate reports showing faculty adherence to lecture timings, content upload requirements, and grade posting deadlines.
*   **FR-AM3.3 Student Attendance Monitoring:** The system shall provide detailed reports on student absence rates within the department, highlighting students who are approaching or have exceeded the dismissal threshold.

**FR-AM4: Communication Management**
*   **FR-AM4.1 Targeted Circulars:** The system shall allow academic management to create and send official decisions or alerts targeted exclusively to specific categories: students of a specific department, students of a specific level, or department faculty.

**FR-AM5: Academic Ticketing & Appeals System**
*   **FR-AM5.1 Ticket Reception & Filtering:** The system shall display a dedicated dashboard for incoming tickets from students and faculty, with filtering options by: priority, creation date, status, or category (e.g., "Grade Appeal" or "Absence Excuse").
*   **FR-AM5.2 Thread History & Interaction:** The system shall allow academic management to respond to tickets for clarification, maintaining a full audit trail of communications within the ticket.
*   **FR-AM5.3 Ticket Routing & Assignment:** The system shall provide an option to route (transfer) a ticket to another employee within the department or to a different department if necessary.
*   **FR-AM5.4 Approval Workflows:** The system shall allow academic management to link sensitive tickets (e.g., grade modification requests) to an electronic approval workflow requiring specific official authorizations before changes are executed in the system.
*   **FR-AM5.5 Action Execution & Resolution:** The system shall allow academic management to change a ticket status to "Resolved" after taking action, automatically notifying the requester and closing the ticket.

**FR-AM6: Decision Support & Predictive Analytics**
*   **FR-AM6.1 At-Risk Student Alerts:** The system shall automatically send proactive alerts to academic management (advisors/dept heads) containing lists of students predicted to struggle or fail based on analytics of grades, attendance, and engagement.
*   **FR-AM6.2 Critical Course Alerts:** The system shall automatically identify and alert academic management regarding "courses with high predicted failure rates" or significant drops in engagement to help evaluate teaching quality or curriculum.

---

#### **Section 4: Faculty Members / Instructors (FM)**

This section covers requirements enabling instructors to manage courses, assessments, and attendance, and their role in feeding the UniBot with academic content.

**FR-FM1: Course Content Management**
*   **FR-FM1.1 Syllabus Management:** The system shall allow instructors to create/modify course syllabi and distribute topics across the weeks of the semester.
*   **FR-FM1.2 Learning Material Upload:** The system shall allow instructors to upload content (Video, PDF, PowerPoint) and organize them into folders or weekly schedules.
*   **FR-FM1.3 AI Data Tagging:** When uploading any text-based file (PDF, Word), the system shall provide a mandatory option to tag the file as "Approved for AI." UniBot shall not index or use any file for student queries unless this tag is active.
*   **FR-FM1.4 Archive Content Import:** The system shall allow instructors to copy educational content (files, syllabi) from a previous semester's section to the current one.

**FR-FM2: Assessment & Grading**
*   **FR-FM2.1 Assignment Creation:** The system shall allow instructors to create assignments, requiring: Title, description, submission mechanism, maximum grade, and Due Date.
*   **FR-FM2.2 Submission Review & Grading:** The system shall provide an interface to review student submissions, enter grades, and provide text-based feedback.
*   **FR-FM2.3 Gradebook Entry:** The system shall provide electronic Gradebooks allowing instructors to manually enter and save student grades for midterm exams, final exams, and coursework.

**FR-FM3: Attendance Management**
*   **FR-FM3.1 Manual Attendance Entry:** The system shall provide a roster allowing instructors to mark student status (Present, Absent, Late, Excused) for each scheduled lecture.
*   **FR-FM3.2 Smart Attendance:** The system shall provide options for automated attendance, such as: generating a dynamic QR Code that changes every 10 seconds, or using Geolocation to verify student presence in the hall.
*   **FR-FM3.3 Retrospective Attendance Modification:** The system shall allow instructors to manually modify attendance status retroactively (e.g., changing "Absent" to "Excused") upon receiving valid justification.

**FR-FM4: Interaction & Messaging**
*   **FR-FM4.1 Course Channel Administration:** As the channel Admin, the instructor shall have the authority to: Pin important messages, delete inappropriate posts, and restrict posting (Read-only mode).
*   **FR-FM4.2 Virtual Office Hours:** The system shall allow instructors to set specific weekly times to be marked as "Online" for immediate response to direct student messages.
*   **FR-FM4.3 Do Not Disturb (DND) Mode:** The system shall provide a DND toggle to stop notifications outside working hours, with an automated reply informing students when the instructor will be available.

**FR-FM5: Student Monitoring & Advising**
*   **FR-FM5.1 Risk Zone Dashboard:** The system shall display a list of students categorized in the "Risk Zone" within the instructor’s sections, based on analytics of absence rates and low grades.
*   **FR-FM5.2 Personalized Recommendations:** The system shall allow instructors to send targeted recommendations to specific students (e.g., sending a review video link to a student who scored poorly on a midterm).

**FR-FM6: Academic Ticketing System**
*   **FR-FM6.1 Ticket Submission:** The system shall allow instructors to open tickets for requests or complaints to academic management, categorizing the issue (e.g., Venue issue, schedule change request, technical problem) with supporting attachments.
*   **FR-FM6.2 Ticket Tracking:** The system shall provide a "My Tickets" view to track status, respond to management inquiries, and close the ticket upon resolution.

---

#### **Section 5: Students (ST)**

This section covers requirements ensuring a focused, easy, and personalized learning experience for the student.

**FR-ST1: Dashboard & Academic Progress**
*   **FR-ST1.1 Interactive Schedule:** The system shall provide students with an updated daily/weekly schedule showing lecture times, course names, actual venues, and instructor names.
*   **FR-ST1.2 My Progress Path:** The system shall display a visual progress bar showing completed versus remaining credit hours for graduation based on the student's study plan.
*   **FR-ST1.3 Virtual GPA Calculator:** The system shall provide an interactive tool for students to enter hypothetical grades for current courses to calculate the impact on their semester and cumulative GPA.

**FR-ST2: Learning Management**
*   **FR-ST2.1 Content Access:** The system shall allow students to browse and download learning materials (Videos, PDFs, Presentations) organized by week.
*   **FR-ST2.2 Assignment Submission:** The system shall allow students to upload assignment files (Text, Images, Documents) before the due date, with automated blocking of late submissions.
*   **FR-ST2.3 Grade Tracking:** The system shall provide a detailed transcript of grades (coursework, assignments, midterms, finals) once published by the instructor.

**FR-ST3: Attendance Tracking**
*   **FR-ST3.1 Self Check-in:** The system shall allow students to register their attendance by scanning a QR Code or via Geolocation verification, depending on the instructor’s settings.
*   **FR-ST3.2 Absence Monitoring:** The system shall display updated statistics of absences (Excused/Unexcused) and send automated warnings as the student approaches the dismissal threshold.

**FR-ST4: Interaction & Messaging**
*   **FR-ST4.1 Direct Messaging:** The system shall allow students to send private messages to instructors (for clarification/office hours) and to peers in the same section (for group work), supporting attachments (PDF, Word, Images).
*   **FR-ST4.2 Messaging Security Constraints:** The system shall prohibit students from exchanging executable files (.exe, .bat) via the messaging system to ensure platform security.
*   **FR-ST4.3 Course Channel Participation:** Students shall be able to participate in the group channel via messages and polls, unless restricted by the instructor.

**FR-ST5: UniBot AI Interaction**
*   **FR-ST5.1 Academic Queries:** Students shall be able to ask UniBot scientific questions. The bot must extract answers exclusively from "AI-Approved" course files, providing precise citations (e.g., page number or video timestamp).
*   **FR-ST5.2 Administrative Queries:** Students shall be able to ask UniBot about university regulations (e.g., "How to request an excuse?" or "Exam start dates"). The bot shall answer based on the knowledge base uploaded by the TA.
*   **FR-ST5.3 Personal Task Management:** Students shall be able to request organizational tasks via chat, such as: "Remind me of tomorrow’s assignment deadline" or "Summarize my tasks for this week."

**FR-ST6: Ticketing & Appeals**
*   **FR-ST6.1 Ticket Submission:** Students shall be able to open official tickets for academic management (e.g., grade appeals, medical excuse approvals) with descriptions and attachments.
*   **FR-ST6.2 AI Pre-resolution:** Before allowing a student to submit an administrative ticket, the system shall route the query to UniBot to attempt an instant solution based on regulations.
*   **FR-ST6.3 Ticket Tracking:** Students shall have an interface to track ticket status (Open, In-Progress, Resolved) and communicate with the processing officer.

---

### **Level Four: Non-Functional Requirements (NFR)**

#### **NFR-SEC: Security & Isolation**
*   **NFR-SEC1 Tenant Data Isolation:** The system shall ensure absolute logical or physical separation of data for each university (Relational DBs, files, and AI Vector DBs) to prevent cross-tenant data leakage.
*   **NFR-SEC2 Data Encryption:** The system shall encrypt all data In-Transit using TLS 1.2+ and hash passwords using secure algorithms (e.g., Bcrypt or Argon2).
*   **NFR-SEC3 AI Data Privacy:** The system shall NOT use private university data, student chats, or academic files to train external Public LLMs.
*   **NFR-SEC4 Malware Prevention:** The system shall automatically scan all uploaded files for executables or malware before cloud storage.

#### **NFR-PER: Performance & Scalability**
*   **NFR-PER1 UI Response Time:** Standard requests (e.g., viewing schedules, navigating pages) shall respond within ≤ 0.5 seconds under normal load.
*   **NFR-PER2 AI Latency:** UniBot shall analyze queries and generate responses within ≤ 5 seconds for complex questions.
*   **NFR-PER3 Auto-Scalability:** The architecture shall support horizontal scaling to handle peak periods (e.g., exam seasons) for thousands of concurrent users.

#### **NFR-REL: Reliability & Availability**
*   **NFR-REL1 System Uptime:** The system shall guarantee 99.9% availability throughout the academic year, excluding scheduled maintenance.
*   **NFR-REL2 Disaster Recovery:** The system shall provide a Recovery Time Objective (RTO) of ≤ 6 hours in case of catastrophic failure.

#### **NFR-USE: Usability & UI/UX**
*   **NFR-USE1 Responsive Design:** The UI shall be optimized for all screen sizes (Desktops, Tablets, Smartphones) without data distortion.
*   **NFR-USE2 Browser Compatibility:** The system shall fully support the latest two versions of Chrome, Safari, Firefox, and Edge.
*   **NFR-USE3 Dark Mode:** The UI shall provide a native Dark Theme toggle to reduce eye strain.

#### **NFR-AI: AI Limitations & Constraints**
*   **NFR-AI1 Anti-Hallucination:** UniBot shall be programmed to clearly apologize (e.g., "I do not have enough information to answer") if the answer is not found in the approved knowledge base, preventing the generation of imaginary info.
*   **NFR-AI2 Predictive Refresh Rate:** The predictive engine shall update "Student Risk" data via batch processing once every 24 hours to optimize server resources.