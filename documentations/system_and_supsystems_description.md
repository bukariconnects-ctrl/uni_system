**I. Technical Identity and General Philosophy of the UniBot Platform**

**UniBot** is a smart, fully independent cloud-based platform operating as a **Standalone Software-as-a-Service (SaaS)** with a **Multi-tenancy** architecture. It is designed to provide a hybrid educational environment that integrates Learning Management (LMS), core Academic Affairs, and Artificial Intelligence capabilities (AI Chatbot & Predictive Analytics).
The platform is **self-contained** (it does not integrate with legacy university systems) and focuses exclusively on academic, educational, and communicative aspects—strictly excluding student financial management, live e-examinations, and excessive administrative complexities.

---

**II. Sub-Systems and Their Interconnections**

The platform consists of **8 sub-systems** working in total harmony:

**1. Platform & Tenant Management System:**
*   **Objective:** To transform the system into a cloud service (SaaS).
*   **Operations:** Managing university subscriptions (by the owner), isolating each university's data in an independent Database/Schema, and customizing visual branding (logo and colors) for each tenant.

**2. Academic Affairs & Structure System:**
*   **Objective:** To build the university’s administrative foundation.
*   **Operations:** Constructing the organizational tree (Colleges > Departments > Majors), defining levels and semesters, building study plans, generating schedules, and assigning venues and instructors.

**3. LMS & Attendance System:**
*   **Objective:** To manage the flow of lectures and assessments.
*   **Operations:** Content uploading (Video, PDF), attendance tracking (manual/automated), calculating dismissal (denial of entry) thresholds, assignment management, and **Grade Recording** (for exams and tasks—*note: the system does not facilitate live e-exam execution*).

**4. Messaging & Interaction System:**
*   **Objective:** To create a secure university communication environment.
*   **Operations:** Direct messaging (Student-to-Instructor / Student-to-Student), automated group channels for every course, and secure file sharing (excluding executables).

**5. Smart Circulars & Alerts System:**
*   **Objective:** To deliver official information with precision.
*   **Operations:** Sending targeted circulars (to specific departments, levels, or sections) and automated system alerts (room changes, lecture cancellations).

**6. Smart Virtual Assistant (UniBot - AI Assistant):**
*   **Objective:** To provide a 24/7 intelligent agent.
*   **Operations:** Answering administrative queries (based on uploaded regulations) and academic queries (based on instructor-uploaded content tagged as "AI-Approved").

**7. Analytics & Predictive Recommendation System:**
*   **Objective:** Early intervention and quality improvement.
*   **Operations:** Predicting student struggle/failure (based on attendance and recorded grades), providing additional content recommendations, and displaying executive Dashboards for management.

**8. Academic Ticketing System:**
*   **Objective:** To automate academic requests, complaints, and appeals.
*   **Operations:** Receiving student and faculty requests, automated routing to relevant academic departments, status tracking, and AI-suggested solutions before a ticket is officially opened. *(This system is restricted to the university level and is not accessible by the Platform Owner).*

---

**III. Users (Actors), Roles, and Permissions**

The system relies on **5 primary user types** with hierarchical permissions:

**1. Platform Owner (Super Admin)**
*   **Role:** The Lessor; the highest technical authority over the infrastructure.
*   **Tasks:** Provisioning workspaces for new universities, managing subscriptions and fees, monitoring server performance and security, and training the Base Language Model (LLM).
*   **Constraints:** Does not interfere in university tickets, cannot view academic data, and has no direct interaction with students.

**2. University Admin (Tenant Admin)**
*   **Role:** The Tenant; the university representative responsible for system configuration.
*   **Tasks:**
    *   Customizing university branding and regional settings.
    *   Building the academic structure (Colleges, Departments).
    *   **User Management:** Bulk importing student and faculty data.
    *   **Permission Management (RBAC):** Creating "Academic Management" roles and assigning specific permissions (e.g., Dean, Registrar).
    *   Feeding internal university regulations into the AI assistant.

**3. Academic Management**
*   **Role:** Operational supervisors (Deans, Dept Heads, Registrars) based on permissions granted by the Tenant Admin.
*   **Tasks:**
    *   Approving study plans and distributing teaching workloads.
    *   Generating schedules and booking venues.
    *   Monitoring instructor and student attendance.
    *   Sending targeted circulars.
    *   **Ticket & Appeal Management:** Receiving, processing, and resolving student/faculty tickets.
    *   Receiving predictive analytics alerts for at-risk students.

**4. Faculty Members / Instructors**
*   **Role:** The academic drivers and knowledge managers.
*   **Tasks:**
    *   Uploading educational content (PDF, Video) and **tagging/approving** it for AI indexing.
    *   Creating assignments and **recording grades** for tasks and exams (manually or via the system).
    *   Tracking and modifying student attendance.
    *   Administering course channels (deleting messages, restricting posts).
    *   Direct student interaction during office hours (with "Do Not Disturb" feature).
    *   Monitoring at-risk students within their sections via system analytics.

**5. Students**
*   **Role:** The end beneficiary.
*   **Tasks:**
    *   Accessing schedules and learning content.
    *   Tracking absence percentages and recorded grades.
    *   Submitting assignment solutions.
    *   Directly communicating with instructors and peers (without sharing executables).
    *   **UniBot Interaction:** Querying academic explanations (from course files), administrative info, or task scheduling.
    *   Opening tickets for academic appeals (e.g., grade disputes) and tracking their status.
*   **Constraints:** No fee payments are processed via the system; no live e-exams are conducted on the platform.

---

**IV. Data Lifecycle and System Workflow**

1.  **Establishment (Owner):** The Platform Owner creates a new university account and hands over credentials to the Tenant Admin.
2.  **Configuration (Tenant Admin):** The Admin sets the logo, builds colleges/departments, bulk-imports users via Excel, and assigns Academic Management roles.
3.  **Planning (Academic Management):** Management sets study plans, generates schedules, and assigns courses to instructors.
4.  **Academic Execution (Instructor):** The Instructor uploads lectures (approving them for AI), records attendance, and logs assignment/exam grades.
5.  **Consumption & Interaction (Student):** The Student views their schedule, downloads lectures, asks UniBot for help with difficult concepts, submits assignments, and monitors grades.
6.  **Support & Analytics (System & Management):** If a student faces an academic issue, they open a ticket for Academic Management. In the background, the Predictive Analytics system monitors student grades/attendance and alerts the instructor and management if a decline is detected.

---

**Detailed Breakdown of Sub-Systems and Associated Users:**

### **1. Platform & Tenant Management System**
This is the core gateway that transforms UniBot from a mere software application into a Cloud Service (SaaS).

*   **Detailed Tasks and Functions:**
    *   **Subscription Management:** Creating, suspending, and renewing subscriptions for universities (tenants).
    *   **Data Isolation:** Ensuring that University A’s data is completely isolated from University B’s data technically and securely.
    *   **Branding Customization:** Allowing each university to upload its logo and define system theme colors to align with its visual identity.
*   **Associated Users:**
    *   **Platform Owner (Super Admin)**
    *   **University Admin (Tenant Admin)**

---

### **2. Academic Affairs & Structure System**
The backbone upon which the university's organizational hierarchy is built within the system.

*   **Detailed Tasks and Functions:**
    *   **Organizational Tree Construction:** Creating Colleges -> Departments -> Majors/Programs.
    *   **Level & Semester Management:** Defining academic levels for each major (Level 1, 2, 3...) and semesters (First Term, Second Term), and linking them to courses.
    *   **Study Plan Management:** Distributing courses across levels, defining prerequisites, and setting credit hours.
    *   **Scheduling & Timetabling:** Generating schedules for each department and major, booking venues, and assigning instructors to courses at specific times to prevent conflicts.
*   **Associated Users:**
    *   **University Admin (Tenant Admin)**
    *   **Academic Management (Deans / Department Heads)**

---

### **3. LMS & Attendance System**
The daily workspace for both faculty and students.

*   **Detailed Tasks and Functions:**
    *   **Digital Content Management:** Uploading lectures (Video, Audio, PDF) and summaries, categorized by academic weeks.
    *   **Attendance Management:**
        *   Daily attendance tracking (manual entry by instructor or automated via the system).
        *   Calculating absence percentages and automatically applying "denial of entry" (dismissal) regulations.
    *   **Assessment Management:** Creating assignments and quizzes, and recording grades in electronic gradebooks.
*   **Associated Users:**
    *   **Faculty Member / Instructor**
    *   **Student**

---

### **4. Messaging & Interaction System**
Responsible for enhancing social and academic communication within the platform.

*   **Detailed Tasks and Functions:**
    *   **Direct Messaging:**
        *   **Student-Instructor:** Private channels for assignment inquiries, clarifications, and booking office hours.
        *   **Student-Student:** Communication between peers in the same section/group (for projects and collaboration), with security constraints (blocking .exe/.bat files).
    *   **Group Messaging:**
        *   **Course Channels:** An automated channel for every course containing the instructor and all enrolled students.
        *   **Features:** Group announcements, polls, and sharing of public files and resources.
    *   **File Management in Chat:** Support for (PDF, Word, Images) with security scanning.
    *   **Message Status:** Tracking (Sent, Delivered, Read).
*   **Associated Users:**
    *   **Faculty Member (Channel Admin)**
    *   **Student**

---

### **5. Smart Circulars & Alerts System**
An official information broadcasting system with high targeting precision.

*   **Detailed Tasks and Functions:**
    *   **Targeted Broadcast:** Ability to send circulars visible only to specific groups (e.g., students of a specific department, a specific level, or a specific section).
    *   **Automated System Notifications:** Alerts for room changes, lecture cancellations, grade releases, or approaching absence thresholds.
*   **Associated Users:**
    *   **Academic Management**
    *   **Automated System**

---

### **6. Smart Virtual Assistant (UniBot - AI Assistant)**
The 24/7 "Digital Employee" serving all users.

*   **Detailed Tasks and Functions:**
    *   **Knowledge Automation:** Answering administrative and academic Frequently Asked Questions (FAQs).
    *   **Semantic Content Search:** Indexing lecture content uploaded by instructors and answering scientific student queries based on those files (e.g., "What is the definition of Algorithm mentioned by the professor in Lecture 3?").
    *   **Administrative Assistant:** Helping students check fees, schedules, and academic status via chat.
*   **Associated Users:**
    *   **All Users**

---

### **7. Analytics & Predictive Recommendation System**
The analytical brain of the platform.

*   **Detailed Tasks and Functions:**
    *   **At-Risk Prediction (Early Warning System):** Algorithms that analyze (attendance + exam grades + system engagement) to identify students at risk of failure early on.
    *   **Recommendation Engine:**
        *   Suggesting additional videos or references for students struggling with specific topics.
        *   Alerting instructors to students who require extra support.
    *   **Smart Reporting:** Dashboards displaying Key Performance Indicators (KPIs) for management.
*   **Associated Users:**
    *   **Academic Management**
    *   **Faculty Member**

---

### **8. Academic Ticketing System**

**I. Concept:**
The Ticketing System is a digital administrative module within each university (tenant) designed to automate and organize the reception and processing of "requests, complaints, and suggestions" submitted by students and faculty. Instead of manual reviews or fragmented messaging, every request is converted into a unique "Ticket" with a digital reference, specific classification, and priority level, ensuring transparency in tracking and rapid resolution by Academic Management.

**II. Detailed Tasks and Functions:**
1.  **Request Creation & Classification:** Ability to open a new ticket, defining its type (Academic, Technical, Financial, Administrative) and attaching supporting documents.
2.  **Smart Priority System:** Categorizing tickets automatically or manually (Urgent, Medium, Low) based on the nature of the request (e.g., "Exam login issue" receives top priority).
3.  **Routing:** Automatically routing tickets to the relevant department within Academic Management based on classification.
4.  **Status Tracking:** Updating ticket status (Open, In-Progress, Resolved, Closed) and notifying the user of every update.
5.  **Thread History:** Providing a conversation space within each ticket for back-and-forth communication between the requester and management.
6.  **Interactive Knowledge Base:** Linking the system to the AI assistant; if a ticket asks for information already in the regulations, the bot suggests the solution immediately before the ticket is finalized.
7.  **Reporting & Statistics:** Generating periodic reports for management regarding (most frequent issues, average response time, and user satisfaction levels).

**III. User Interactions and Roles:**

**1. Requester Role (Student or Faculty):**
*   **Opening a Ticket:** Submitting a request via a simple interface requiring (Title, Classification, Description, and Attachments).
*   **Tracking:** Accessing the "My Tickets" list to see who is currently responsible for processing the request.
*   **Interaction:** Responding to management inquiries within the ticket if additional information is requested.
*   **Closing & Rating:** Closing the ticket after resolution and rating the quality of service provided.

**2. Processor Role (Academic Management):**
*   **Admin Dashboard:** Reviewing all incoming tickets and filtering them by age or priority.
*   **Response:** Writing official replies or requesting missing information from the requester.
*   **Routing:** Transferring the ticket to another employee or department if necessary.
*   **Action Execution:** Fulfilling the request (e.g., modifying a schedule, approving an excuse, correcting a grade entry) then changing the status to "Resolved."

**3. Oversight Role (University Admin / Tenant Admin):**
*   **Performance Monitoring:** Ensuring no tickets are stalled for extended periods.
*   **Data Analysis:** Identifying flaws in specific departments if related complaints increase (e.g., excessive classroom complaints in a specific department) to make comprehensive administrative decisions.

**IV. Workflow Path Scenario:**
1.  **Start:** A student notices an error in a "Practical Grade" and opens the UniBot ticketing window.
2.  **AI Intervention:** The bot attempts to help first; if unsuccessful, a "Ticket is Generated."
3.  **Management:** The ticket appears on the Academic Management dashboard under the category "Grade Review - Practical Dept."
4.  **Processing:** The administrator reviews the instructor's records, finds a minor error, corrects it in the system, and replies to the ticket: "Correction successful."
5.  **End:** The student receives a notification, opens the ticket, finds the solution, rates the service with 5 stars, and the ticket is closed and archived.