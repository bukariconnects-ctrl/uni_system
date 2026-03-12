# **UniBot - UI/UX Theme & Design System Documentation**

## **1. Design Philosophy & Overall Vibe**
The UniBot platform adopts a **"Modern Enterprise SaaS"** design language tailored for the academic sector. The interface is clean, minimalist, and highly structured to reduce cognitive load. It utilizes a "Bento Box" grid layout for dashboards, ample whitespace, and soft UI elements to create a trustworthy, focused, and futuristic educational environment.

## **2. Color Palette**
The color system is designed to convey trust (Academic Blues), clarity (Neutrals), and immediate context (Semantic Colors).

### **A. Primary & Brand Colors**
*   **Academic Navy (Header/Brand):** `#2A4365` (Used for top navigation bars and primary branding).
*   **Action Blue (Primary Buttons/Active States):** `#3182CE` (Used for primary buttons, active sidebar links, and progress bars).
*   **AI Gradient (UniBot Identity):** A soft gradient from Light Blue `#EBF8FF` to Soft Lavender `#E9D8FD` (Used for AI chat bubbles, AI-Approved badges, and UniBot UI elements).

### **B. Backgrounds & Neutrals**
*   **App Background:** `#F7FAFC` (A very light, cool gray to separate content cards from the background and reduce eye strain).
*   **Card Background:** `#FFFFFF` (Pure white for all content containers, widgets, and modals).
*   **Text Colors:**
    *   Primary Text (Headings): `#1A202C` (Dark Slate).
    *   Secondary Text (Subtitles/Meta): `#718096` (Medium Gray).
    *   Borders & Dividers: `#E2E8F0` (Light Gray).

### **C. Semantic & Data Visualization Colors**
Used for the Analytics Dashboard, Risk Zones, and Schedule Calendar:
*   **Critical/Danger (High Risk):** `#E53E3E` (Red)
*   **Warning (Moderate Risk):** `#DD6B20` (Orange/Yellow)
*   **Success/Safe:** `#38A169` (Green)
*   **Calendar/Chart Accents:** Teal (`#319795`), Purple (`#805AD5`), Orange (`#ED8936`).

## **3. Typography**
*   **Font Family:** A modern, highly legible Sans-Serif font (e.g., *Inter, SF Pro Display, or Roboto*).
*   **Hierarchy:**
    *   **Headers (H1, H2):** Bold (700), Dark Slate, used for page titles (e.g., "Introduction to Computer Science").
    *   **Body Text:** Regular (400), Medium Gray, used for descriptions and chat messages.
    *   **Micro-copy:** Medium (500), small size, used for timestamps, file sizes, and meta-tags.

## **4. Core UI Components & Shapes**

### **A. Cards & Containers**
*   **Border Radius:** Rounded corners, typically `12px` or `16px` for main cards and widgets.
*   **Shadows:** Soft, diffused drop shadows (e.g., `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05)`) to lift content off the light gray background.

### **B. Buttons & Tags**
*   **Primary Buttons:** Solid Action Blue background, white text, fully rounded (`border-radius: 8px`).
*   **Pill Tags:** Used for GPA, Majors, and Risk Levels. Fully rounded (`border-radius: 9999px`) with a light background and darker text of the same color family (e.g., Light Red background with Dark Red text for "High Risk").
*   **AI-Approved Toggle:** A distinct UI component featuring a sparkle icon `✨`, a blue active state, and a checkmark, emphasizing the AI data-feeding requirement.

### **C. Navigation**
*   **Top Navbar:** Solid Academic Navy background, white text, containing global search, notifications, and user profile avatar.
*   **Left Sidebar (Student View):** White background, gray inactive icons, with the active tab highlighted by a light blue background and Action Blue text/icon.

## **5. Specific Screen Layout Rules**

### **1. Faculty LMS (Course Management)**
*   **Layout:** Accordion-style list for weekly content.
*   **Features:** A prominent dashed-border "Drag and Drop" upload zone. Each uploaded file displays its icon (PDF/Video), metadata, and the critical **"AI-Approved" toggle switch**.

### **2. Analytics Dashboard (Academic Management)**
*   **Layout:** Masonry/Bento grid layout for widgets.
*   **Features:** Clean data visualization (Donut charts for attendance, Line charts for performance). A dedicated **"Risk Zone" widget** displaying student avatars, names, and color-coded risk severity badges.

### **3. UniBot AI Interface**
*   **Layout:** Split-screen view. Document/Context on the left (70% width), Chat interface on the right (30% width).
*   **Features:** Chat bubbles use the AI Gradient. The AI responses include **Clickable Citation Chips** (e.g., "From p. 15") linking directly to the document on the left. Prompt suggestion chips at the bottom.

### **4. Student Dashboard**
*   **Layout:** Sidebar navigation. Top widget for progress, bottom widget for the schedule.
*   **Features:** The **"My Progress Path"** is a horizontal progress bar showing completed vs. remaining credits. The **Weekly Schedule** is a clean grid with colorful, rounded blocks representing lectures, displaying time, course name, and venue.