# **UniBot - UI/UX Theme & Design System Documentation**

## **1. Design Philosophy & Overall Vibe**
The UniBot platform adopts a **"Modern Enterprise SaaS"** design language tailored for the academic sector. The interface is clean, minimalist, and highly structured to reduce cognitive load. It utilizes a "Bento Box" grid layout for dashboards, ample whitespace, and soft UI elements to create a trustworthy, focused, and futuristic educational environment.

## **2. Color Palette**
The color system is designed to convey trust (Royal Blue), warmth (Peach), clarity (Neutrals), and immediate context (Semantic Colors).

### **A. Primary & Brand Colors**
*   **Royal Blue (Primary / Header / Brand):** `#00539C` — `hsl(208 100% 30%)` (Used for top navigation bars, primary branding, and AI identity elements).
*   **Peach (Secondary / Accent / Action):** `#EEA47F` — `hsl(20 78% 71%)` (Used for primary buttons, active sidebar links, progress bars, and accent highlights).
*   **AI Gradient (UniBot Identity):** A smooth gradient from Royal Blue `#00539C` to Peach `#EEA47F` (Used for AI chat avatars, AI-Approved badges, UniBot header, and all AI-related UI elements).

### **B. Backgrounds & Neutrals**
*   **App Background:** `#F7FAFC` — `hsl(210 33% 98%)` (A very light, cool gray to separate content cards from the background and reduce eye strain).
*   **Card Background:** `#FFFFFF` — `hsl(0 0% 100%)` (Pure white for all content containers, widgets, and modals).
*   **Text Colors:**
    *   Primary Text (Headings): `#1A202C` — `hsl(218 23% 14%)` (Dark Slate).
    *   Secondary Text (Subtitles/Meta): `#718096` — `hsl(215 16% 47%)` (Medium Gray).
    *   Borders & Dividers: `#E2E8F0` — `hsl(214 32% 91%)` (Light Gray).

### **C. Semantic & Data Visualization Colors**
Used for the Analytics Dashboard, Risk Zones, and Schedule Calendar:
*   **Critical/Danger (High Risk):** `#E53E3E` — `hsl(0 72% 51%)` (Red)
*   **Warning (Moderate Risk):** `#EEA47F` — `hsl(20 78% 71%)` (Peach, shared with accent)
*   **Success/Safe:** `#38A169` — `hsl(142 43% 44%)` (Green)
*   **Calendar/Chart Accents:** Teal (`#319795` — `hsl(174 48% 40%)`), Purple (`#805AD5` — `hsl(263 54% 58%)`), Orange (`#EEA47F` — `hsl(20 78% 71%)`).

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
*   **Primary Buttons:** Solid Royal Blue background, white text, fully rounded (`border-radius: 8px`).
*   **Pill Tags:** Used for GPA, Majors, and Risk Levels. Fully rounded (`border-radius: 9999px`) with a light background and darker text of the same color family (e.g., Light Red background with Dark Red text for "High Risk").
*   **AI-Approved Toggle:** A distinct UI component featuring a sparkle icon `✨`, a blue active state, and a checkmark, emphasizing the AI data-feeding requirement.

### **C. Navigation**
*   **Top Navbar:** Solid Royal Blue background, white text, containing global search, notifications, and user profile avatar.
*   **Left Sidebar (Student View):** White background, gray inactive icons, with the active tab highlighted by a light blue background and Royal Blue text/icon.

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