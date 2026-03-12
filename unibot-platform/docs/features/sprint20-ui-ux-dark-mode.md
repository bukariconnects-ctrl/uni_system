# Sprint 20: UI/UX Polish & Responsiveness + Dark Mode
## [NFR-USE1, NFR-USE3]

### الوصف
تطبيق الوضع الداكن (Dark Mode) عبر التطبيق بالكامل مع تحسين الاستجابية (Responsiveness) لجميع الشاشات.

### المكونات

#### 1. Dark Mode Infrastructure
- `src/components/theme-provider.tsx` — ThemeProvider wrapper باستخدام `next-themes`
- `src/components/theme-toggle.tsx` — زر تبديل الوضع (Moon/Sun icons)
- `src/app/globals.css` — متغيرات CSS للوضع الداكن (`.dark` class)
- `src/app/layout.tsx` — إضافة ThemeProvider + `suppressHydrationWarning`

#### 2. Dark Mode Colors (theme.md compliance)
| المتغير | Light | Dark |
|---------|-------|------|
| `--color-app-bg` | `#F7FAFC` | `#0F1117` |
| `--color-card-bg` | `#FFFFFF` | `#1A1D2E` |
| `--color-text-primary` | `#1A202C` | `#E2E8F0` |
| `--color-text-secondary` | `#718096` | `#A0AEC0` |
| `--color-border` | `#E2E8F0` | `#2D3748` |
| `--color-action-blue` | `#3182CE` | `#63B3ED` |
| `--color-danger` | `#E53E3E` | `#FC8181` |
| `--color-warning` | `#DD6B20` | `#F6AD55` |
| `--color-success` | `#38A169` | `#68D391` |

#### 3. Responsive Sidebar (Mobile Drawer)
- `src/components/sidebar-shell.tsx` — SharedSidebarShell component:
  - Desktop (`lg:`): Static sidebar ثابت
  - Mobile: Hamburger menu → slide-in drawer مع backdrop overlay
  - ThemeToggle مدمج في أسفل الـ sidebar (desktop) وفي الـ mobile header
- جميع الـ 5 sidebars تستخدم SidebarShell

#### 4. Responsive Layouts
- جميع الـ 5 layouts تم تحديثها بـ `pt-16 lg:pt-0` لإفساح المجال للـ mobile header

### الملفات المُنشأة
- `src/components/theme-provider.tsx`
- `src/components/theme-toggle.tsx`
- `src/components/sidebar-shell.tsx`

### الملفات المُعدَّلة
- `src/app/globals.css` — Dark mode CSS variables
- `src/app/layout.tsx` — ThemeProvider wrapper
- `src/app/student/components/sidebar.tsx` — SidebarShell wrapper
- `src/app/faculty/components/sidebar.tsx` — SidebarShell wrapper
- `src/app/academic-management/components/sidebar.tsx` — SidebarShell wrapper
- `src/app/tenant-admin/components/sidebar.tsx` — SidebarShell wrapper
- `src/app/super-admin/components/sidebar.tsx` — SidebarShell wrapper
- `src/app/student/layout.tsx` — Responsive padding
- `src/app/faculty/layout.tsx` — Responsive padding
- `src/app/academic-management/layout.tsx` — Responsive padding
- `src/app/tenant-admin/layout.tsx` — Responsive padding
- `src/app/super-admin/layout.tsx` — Responsive padding

### الحزم المُضافة
- `next-themes` — إدارة الوضع الداكن/الفاتح
