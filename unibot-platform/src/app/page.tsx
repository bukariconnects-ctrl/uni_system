"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Calendar,
  BarChart3,
  Shield,
  ArrowLeft,
  GraduationCap,
  Bot,
  BookOpen,
  Users,
  CheckCircle2,
  Menu,
  X,
  ChevronDown,
  Star,
  Quote,
  Layers,
  Zap,
  Globe,
  Clock,
  MessageSquare,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Twitter,
  HelpCircle,
  Plus,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/* ─── Constants ─────────────────────────────────────────── */
const COLORS = {
  royal: "#00539C",
  peach: "#EEA47F",
  navy: "#0A1628",
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" as const },
  transition: { duration: 0.6, ease: "easeOut" as const, delay },
});

/* ─── Animated Counter ──────────────────────────────────── */
function Counter({ end, suffix = "", decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const steps = 40;
          const duration = 1800;
          let i = 0;
          const interval = setInterval(() => {
            i++;
            const progress = Math.min(i / steps, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * end);
            if (i >= steps) clearInterval(interval);
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ─── Floating Particles ────────────────────────────────── */
const PARTICLE_COUNT = 28;
function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            left: `${(i * 3.571) % 100}%`,
            top: `${(i * 7.143 + 13) % 100}%`,
            background: i % 3 === 0 ? "#00539C" : i % 3 === 1 ? "#EEA47F" : "#00539C",
            opacity: 0.15 + (i % 5) * 0.06,
          }}
          animate={{
            y: [0, -30 - (i % 20), 0],
            x: [0, (i % 2 === 0 ? 1 : -1) * (10 + (i % 15)), 0],
            opacity: [0.15 + (i % 5) * 0.06, 0.3 + (i % 5) * 0.08, 0.15 + (i % 5) * 0.06],
            scale: [1, 1.3 + (i % 3) * 0.15, 1],
          }}
          transition={{
            duration: 3 + (i % 7) * 1.2,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Floating Shapes ──────────────────────────────────── */
const SHAPES = [
  { type: "circle", size: 40, left: "8%", top: "20%", color: "from-royal-blue/20 to-transparent" },
  { type: "square", size: 56, left: "85%", top: "15%", color: "from-peach/15 to-transparent" },
  { type: "circle", size: 28, left: "75%", top: "70%", color: "from-royal-blue/15 to-transparent" },
  { type: "square", size: 48, left: "5%", top: "72%", color: "from-peach/10 to-transparent" },
  { type: "circle", size: 64, left: "50%", top: "80%", color: "from-royal-blue/10 to-transparent" },
  { type: "square", size: 32, left: "92%", top: "45%", color: "from-peach/20 to-transparent" },
  { type: "circle", size: 20, left: "45%", top: "12%", color: "from-peach/15 to-transparent" },
];

function FloatingShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SHAPES.map((shape, i) => (
        <motion.div
          key={i}
          className={`absolute bg-gradient-to-br ${shape.color} backdrop-blur-[2px] border border-white/10 shadow-xl ${
            shape.type === "circle" ? "rounded-full" : "rounded-[14px] rotate-12"
          }`}
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.left,
            top: shape.top,
          }}
          animate={{
            y: [0, -20 - (i % 3) * 10, 0],
            rotate: shape.type === "square" ? [12, 32, 12] : [0, 15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 5 + i * 0.8,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Gradient Shimmer Text ────────────────────────────── */
function ShimmerText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="bg-gradient-to-r from-royal-blue via-royal-blue/80 to-peach bg-clip-text text-transparent">
        {children}
      </span>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-clip-text text-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* ─── Hero Section ──────────────────────────────────────── */
function HeroSection() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.93]);

  const sectionRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 25 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [mouseX, mouseY]);

  const tiltX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const tiltY = useTransform(springX, [-0.5, 0.5], [-4, 4]);

  /* ─── رول البيانات الحية (Live Data Feed) ─── */
  const liveUpdates = [
    { label: "طلاب نشطون الآن", value: 342, icon: Users, color: "text-emerald-400" },
    { label: "محاضرات اليوم", value: 18, icon: BookOpen, color: "text-sky-400" },
    { label: "استفسارات UniBot", value: 127, icon: Bot, color: "text-amber-400" },
  ];

  return (
    <motion.section
      ref={sectionRef}
      style={{ opacity: heroOpacity, scale: heroScale }}
      className="relative min-h-dvh flex items-center bg-gradient-to-br from-[#0A1628] via-[#0F1F3A] to-[#162240] py-20"
    >
      {/* ── الخلفية ── */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(0,83,156,0.3)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(238,164,127,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,83,156,0.12)_0%,transparent_40%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <Particles />
        <FloatingShapes />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
      </div>

      {/* ── المحتوى الرئيسي ── */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ═══ الجانب الأيسر — النصوص ═══ */}
          <div className="text-right">
            {/* شارة */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-royal-blue/30 bg-royal-blue/10 px-4 py-1.5 text-xs font-medium text-royal-blue/90 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
                المنصة متاحة الآن
              </span>
            </motion.div>

            {/* العنوان الرئيسي */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl"
            >
              <span className="text-white">نظام إدارة جامعي</span>
              <br />
              <span className="bg-gradient-to-l from-royal-blue via-royal-blue/80 to-peach bg-clip-text text-transparent">
                يعمل بالذكاء الاصطناعي
              </span>
            </motion.h1>

            {/* الوصف */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg"
            >
              منصة متكاملة تجمع بين <span className="text-white/80 font-medium">الجداول الذكية، المساعد الآلي، التحليلات التنبؤية،</span> وإدارة الحضور — كل شيء في نظام سحابي آمن.
            </motion.p>

            {/* نقاط القوة — ٣ عناصر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 space-y-3"
            >
              {[
                { icon: CheckCircle2, text: "مساعد ذكي يستخدم تقنية RAG للرد الفوري" },
                { icon: CheckCircle2, text: "جداول دراسية بدون تعارضات — تلقائياً" },
                { icon: CheckCircle2, text: "تحليلات تنبؤية تكتشف الطلاب المعرضين للخطر" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm text-white/60">
                  <item.icon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{item.text}</span>
                </div>
              ))}
            </motion.div>

            {/* الأزرار */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-l from-royal-blue to-royal-blue/80 px-7 py-3 text-sm font-bold text-white shadow-2xl shadow-royal-blue/30 transition-all duration-300 hover:shadow-[0_0_35px_rgba(0,83,156,0.5)] hover:scale-[1.03]"
              >
                <span>ابدأ التجربة المجانية</span>
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                <div className="absolute inset-0 -translate-x-full skew-x-6 bg-white/10 transition-transform duration-500 group-hover:translate-x-0" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/30"
              >
                شاهد الميزات
                <ChevronDown className="h-4 w-4" />
              </a>
            </motion.div>

            {/* شريط التحديثات المباشرة — Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10 flex flex-wrap gap-6 border-t border-white/5 pt-6"
            >
              {liveUpdates.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <div>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-bold text-white"
                      >
                        <Counter end={item.value} />
                      </motion.span>
                      <span className="mr-1.5 text-xs text-white/40">{item.label}</span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* ═══ الجانب الأيمن — معاينة المنصة ═══ */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ x: useTransform(tiltX, [-4, 4], [8, -8]), y: useTransform(tiltY, [-4, 4], [-8, 8]) }}
            className="relative"
          >
            {/* إطار الجهاز / البطاقة */}
            <div className="relative mx-auto w-full max-w-lg">
              {/* ظل متوهج خلف البطاقة */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-royal-blue/20 via-peach/10 to-transparent blur-2xl opacity-60" />

              {/* بطاقة المعاينة الرئيسية */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl">
                {/* شريط العنوان (Status Bar) */}
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-[10px] font-medium text-white/40 tracking-wide">UniBot — لوحة التحكم</span>
                  <div className="h-5 w-5 rounded-full bg-white/5" />
                </div>

                {/* محتوى البطاقة */}
                <div className="p-5 space-y-4">
                  {/* شريط البحث */}
                  <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3.5 py-2.5">
                    <MessageSquare className="h-4 w-4 text-white/30" />
                    <span className="text-xs text-white/40">اسأل UniBot عن أي شيء...</span>
                    <div className="mr-auto flex gap-1">
                      <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30 sm:inline">⌘K</kbd>
                    </div>
                  </div>

                  {/* شبكة البطاقات الصغيرة — Mockup Dashboard */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* بطاقة الطلاب */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                      <div className="flex items-center justify-between">
                        <Users className="h-3.5 w-3.5 text-royal-blue/60" />
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400">+12%</span>
                      </div>
                      <p className="mt-2 text-lg font-bold text-white">٢٬٤٥٠</p>
                      <p className="text-[10px] text-white/40">إجمالي الطلاب</p>
                      {/* شريط تقدم */}
                      <div className="mt-2 h-1 w-full rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "72%" }}
                          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-l from-royal-blue to-royal-blue/60"
                        />
                      </div>
                    </div>

                    {/* بطاقة المحاضرات */}
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                      <div className="flex items-center justify-between">
                        <Calendar className="h-3.5 w-3.5 text-peach/60" />
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-400">اليوم</span>
                      </div>
                      <p className="mt-2 text-lg font-bold text-white">١٨</p>
                      <p className="text-[10px] text-white/40">محاضرة مجدولة</p>
                      <div className="mt-2 flex -space-x-1">
                        {[1,2,3,4].map((i) => (
                          <div key={i} className="h-5 w-5 rounded-full border-2 border-[#0F1F3A] bg-gradient-to-br from-royal-blue/40 to-peach/40" />
                        ))}
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0F1F3A] bg-white/5 text-[7px] font-bold text-white/40">+</div>
                      </div>
                    </div>

                    {/* بطاقة UniBot — صف كامل */}
                    <div className="col-span-2 rounded-xl border border-royal-blue/10 bg-gradient-to-r from-royal-blue/5 to-transparent p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-royal-blue to-peach shadow-lg">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white/80">UniBot</span>
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-medium text-emerald-400">متصل</span>
                            <span className="mr-auto text-[9px] text-white/30">منذ دقيقة</span>
                          </div>
                          {/* فقاعة محادثة متحركة */}
                          <div className="mt-2 space-y-1.5">
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.5 }}
                              className="w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-royal-blue/20 px-3 py-2"
                            >
                              <p className="text-[11px] leading-relaxed text-white/70">وعليكم السلام 👋 كيف يمكنني مساعدتك اليوم؟</p>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 2.5 }}
                              className="mr-auto w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white/5 px-3 py-2"
                            >
                              <p className="text-[11px] leading-relaxed text-white/70">عندي استفسار عن جدول المحاضرات</p>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 3.5 }}
                            >
                              <span className="inline-flex items-center gap-1 text-[9px] text-royal-blue/60 cursor-pointer hover:text-royal-blue/80 transition-colors">
                                <Zap className="h-3 w-3" />
                                يجيب UniBot...
                              </span>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* مؤشر التمرير */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-12 flex justify-center"
        >
          <motion.a
            href="#features"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1], y: [0, 3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="mt-1.5 h-1.5 w-0.5 rounded-full bg-white/40"
            />
          </motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ─── Features Section (Bento Grid) ─────────────────────── */
const features = [
  {
    icon: Bot,
    title: "المساعد الافتراضي UniBot",
    desc: "مساعد ذكي يعتمد على RAG يجب على استفسارات الطلاب والمحاضرين من قاعدة معرفة مؤسستك.",
    gradient: "from-royal-blue to-royal-blue/70",
    badge: "AI",
    wide: false,
    tall: false,
  },
  {
    icon: Calendar,
    title: "الجداول الذكية",
    desc: "نظام جدولة متقدم يكتشف التعارضات ويوزع القاعات تلقائياً دون تداخل.",
    gradient: "from-royal-blue to-peach",
    badge: "Smart",
    wide: false,
    tall: false,
  },
  {
    icon: BarChart3,
    title: "التحليل التنبؤي",
    desc: "نظام إنذار مبكر يكتشف الطلاب المعرضين للخطر قبل فوات الأوان.",
    gradient: "from-peach to-peach/70",
    badge: "Analytics",
    wide: false,
    tall: false,
  },
  {
    icon: Shield,
    title: "العزل السحابي الآمن",
    desc: "بنية متعددة المستأجرين تعزل بيانات كل جامعة بمعايير أمان صارمة.",
    gradient: "from-royal-blue to-peach",
    badge: "Secure",
    wide: true,
    tall: false,
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative px-6 py-24 md:py-32 bg-gradient-to-b from-card-bg via-app-bg to-card-bg">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-royal-blue blur-3xl" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-peach blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div {...fadeUp()} className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <Sparkles className="h-3.5 w-3.5" />
            مميزات المنصة
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            كل ما تحتاجه لإدارة مؤسستك التعليمية
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            أدوات متكاملة تغطي جميع احتياجات الجامعة — من الإدارة إلى التدريس إلى تجربة الطالب.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-card-bg/70 backdrop-blur-sm p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${
                  feature.wide ? "sm:col-span-2" : ""
                } ${feature.tall ? "sm:row-span-2" : ""}`}
              >
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.04]`} />

                {/* Icon */}
                <div className={`relative mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.gradient} p-3 shadow-md shadow-royal-blue/10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-0.5`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Badge */}
                <span className="absolute top-4 right-4 rounded-full bg-royal-blue/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-royal-blue/60 transition-colors duration-300 group-hover:bg-royal-blue/10 group-hover:text-royal-blue">
                  {feature.badge}
                </span>

                <h3 className="relative mb-2 text-lg font-bold text-navy">{feature.title}</h3>
                <p className="relative text-sm leading-relaxed text-text-secondary">{feature.desc}</p>
              </motion.div>
            );
          })}

          {/* Extra bento card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-royal-blue to-royal-blue/80 p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              <Zap className="mb-3 h-8 w-8 text-white/90" />
              <h3 className="text-lg font-bold text-white">انطلق مع Unibot اليوم</h3>
              <p className="mt-2 text-sm text-white/80">حوّل مؤسستك التعليمية إلى منصة رقمية متكاملة</p>
              <Link href="/login" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30">
                ابدأ الآن
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ──────────────────────────────────────── */
const steps = [
  { num: "01", icon: Layers, title: "تهيئة المؤسسة", desc: "أنشئ حساب مؤسستك وحدد هيكلك الأكاديمي في دقائق — كليات، أقسام، مقررات." },
  { num: "02", icon: BookOpen, title: "إدارة المقررات", desc: "وزع المحاضرين والطلاب، أنشئ الجداول والتكاليف، وتابع الحضور آنياً." },
  { num: "03", icon: Users, title: "تجربة الطالب الذكية", desc: "الطلاب يستخدمون UniBot ويتابعون حضورهم ودرجاتهم ويتواصلون مع المحاضرين." },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative px-6 py-24 md:py-32 bg-card-bg overflow-hidden">
      {/* Geometric decoration */}
      <div className="absolute top-0 left-0 h-32 w-32 rounded-br-[48px] bg-gradient-to-br from-royal-blue/5 to-transparent" />
      <div className="absolute bottom-0 right-0 h-32 w-32 rounded-tl-[48px] bg-gradient-to-tl from-peach/5 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div {...fadeUp(0.15)} className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-peach/15 px-4 py-1.5 text-sm font-medium text-peach">
            <Layers className="h-3.5 w-3.5" />
            خطوات بسيطة
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            ابدأ في ثلاث خطوات
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            من التهيئة إلى التشغيل الكامل — منصتك جاهزة في أسرع وقت.
          </p>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line */}
          <div className="absolute right-1/4 top-20 hidden h-0.5 w-1/2 bg-gradient-to-r from-royal-blue via-peach to-royal-blue/20 md:block" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step number circle */}
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-royal-blue to-royal-blue/80 text-white shadow-lg shadow-royal-blue/20 transition-transform duration-300 hover:scale-110">
                  <Icon className="h-7 w-7" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-peach text-[10px] font-bold text-white shadow-md">
                    {step.num}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-navy">{step.title}</h3>
                <p className="max-w-xs text-sm text-text-secondary">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ──────────────────────────────────────── */
const testimonials = [
  {
    name: "نائل أديب",
    role: "مدير الجامعة",
    uni: "جامعة العلوم والتكنولوجيا",
    content: "UniBot غيّر طريقة إدارة جامعتنا بالكامل. المساعد الذكي وحده وفر ٦٠٪ من وقت الإجابات على استفسارات الطلاب. نظام متكامل بمعنى الكلمة.",
    rating: 5,
  },
  {
    name: "صبري الشيباني",
    role: "مدير الجامعة",
    uni: "جامعة الجند",
    content: "نظام الجداول الذكية أنهى مشكلة التعارضات للأبد. المنصة سهلة الاستخدام وفريق الدعم متعاون جداً. أنصح بها كل مؤسسة تعليمية.",
    rating: 5,
  },
  {
    name: "إبراهيم البكاري",
    role: "مدير الجامعة",
    uni: "جامعة الرواد",
    content: "الأمان والعزل بين المستأجرين على أعلى مستوى. واجهة مستخدم جميلة وسهلة، والتقارير التحليلية دقيقة جداً. تجربة رائعة منذ اليوم الأول.",
    rating: 5,
  },
];

function TestimonialsSection() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % testimonials.length), []);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + testimonials.length) % testimonials.length), []);

  return (
    <section className="relative px-6 py-24 md:py-32 bg-gradient-to-b from-app-bg to-card-bg overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-royal-blue/[0.02] blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-peach/[0.02] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <motion.div {...fadeUp()} className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <Star className="h-3.5 w-3.5 fill-royal-blue" />
            آراء العملاء
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            ماذا يقولون عن UniBot
          </h2>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="relative rounded-2xl border border-border bg-card-bg p-8 sm:p-10 shadow-lg"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 h-8 w-8 text-royal-blue/10" />

              {/* Stars */}
              <div className="mb-6 flex gap-1">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-peach text-peach" />
                ))}
              </div>

              {/* Content */}
              <p className="text-base sm:text-lg leading-relaxed text-navy/80">
                {testimonials[current].content}
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-4 border-t border-border pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-royal-blue to-peach text-sm font-bold text-white shadow-md">
                  {testimonials[current].name.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="font-bold text-navy">{testimonials[current].name}</p>
                  <p className="text-xs text-text-secondary">{testimonials[current].role} — {testimonials[current].uni}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-all duration-200 hover:border-royal-blue/30 hover:text-royal-blue hover:shadow-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-royal-blue" : "w-2 bg-royal-blue/20"}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-all duration-200 hover:border-royal-blue/30 hover:text-royal-blue hover:shadow-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Logo Cloud / Trust Bar ───────────────────────────── */
const universities = [
  "جامعة العلوم والتكنولوجيا", "جامعة الجند", "جامعة الرواد",
  "جامعة الملك سعود", "جامعة القاهرة", "جامعة الشارقة",
];

function LogoTickerSection() {
  return (
    <section className="relative border-y border-border/40 bg-card-bg py-10">
      <div className="mx-auto max-w-7xl px-6">
        <motion.p {...fadeUp(0.1)} className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-text-secondary">
          موثوق من قبل هذه المؤسسات
        </motion.p>
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex shrink-0 gap-12"
          >
            {[...universities, ...universities].map((name, i) => (
              <div
                key={i}
                className="flex h-10 shrink-0 items-center gap-3 rounded-lg border border-border/30 bg-card-bg px-5 shadow-sm"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-royal-blue/20 to-peach/20 text-[10px] font-bold text-royal-blue">
                  {name.charAt(0)}
                </div>
                <span className="whitespace-nowrap text-sm font-medium text-text-secondary">{name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Banner ──────────────────────────────────────── */
function StatsBannerSection() {
  const stats = [
    { value: 12, suffix: "+", label: "جامعة", icon: GraduationCap },
    { value: 8500, suffix: "+", label: "طالب مسجل", icon: Users },
    { value: 340, suffix: "+", label: "محاضر", icon: BookOpen },
    { value: 25000, suffix: "+", label: "محاضرة منشأة", icon: Calendar },
    { value: 12000, suffix: "+", label: "استفسار ذكي", icon: Bot },
    { value: 99.9, suffix: "%", label: "نسبة التشغيل", icon: Zap, decimals: 1 },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-royal-blue via-royal-blue/95 to-navy py-16">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(238,164,127,0.08),transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-3 gap-6 md:grid-cols-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center"
              >
                <Icon className="mx-auto mb-2 h-4 w-4 text-white/40" />
                <p className="text-xl font-bold text-white sm:text-2xl">
                  <Counter end={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                </p>
                <p className="mt-0.5 text-[11px] text-white/50">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature Tabs ──────────────────────────────────────── */
const featureTabs = [
  {
    id: "ai",
    icon: Bot,
    title: "المساعد الذكي UniBot",
    desc: "نظام RAG متطور يجيب على استفسارات الطلاب والمحاضرين مباشرة من قاعدة معرفة مؤسستك.",
    features: ["رد فوري على جميع الاستفسارات", "قاعدة معرفة مخصصة لكل جامعة", "دعم متعدد اللغات — عربي، إنجليزي", "تكامل مع أنظمة إدارة التعلم"],
    gradient: "from-royal-blue/20 via-royal-blue/10 to-transparent",
    accent: "from-royal-blue to-royal-blue/80",
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "جداول ذكية بدون تعارضات",
    desc: "خوارزمية متطورة تكتشف التعارضات وتوزع القاعات والمدرسين بكفاءة عالية.",
    features: ["كشف تلقائي للتعارضات", "توزيع ذكي للقاعات", "جدولة المحاضرات البديلة", "إشعارات فورية للتعديلات"],
    gradient: "from-peach/20 via-royal-blue/10 to-transparent",
    accent: "from-peach to-peach/80",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "التحليلات التنبؤية",
    desc: "نظام إنذار مبكر يحلل أداء الطلاب ويكتشف المعرضين للخطر قبل فوات الأوان.",
    features: ["تحليل أداء الطلاب آنياً", "تقارير تفاعلية قابلة للتصدير", "تنبؤ بمعدلات النجاح", "خرائط حرارية للحضور"],
    gradient: "from-emerald-500/20 via-royal-blue/10 to-transparent",
    accent: "from-emerald-500 to-emerald-600",
  },
  {
    id: "security",
    icon: Shield,
    title: "الأمان والعزل السحابي",
    desc: "بنية متعددة المستأجرين تعزل بيانات كل مؤسسة بمعايير أمان عالمية وتشفير متقدم.",
    features: ["عزل كامل للبيانات بين المؤسسات", "تشفير AES-256 للبيانات", "الامتثال لمعايير ISO 27001", "نسخ احتياطي يومي آلي"],
    gradient: "from-purple-500/20 via-royal-blue/10 to-transparent",
    accent: "from-purple-500 to-purple-600",
  },
];

function FeatureTabsSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="features-deep" className="relative px-6 py-24 md:py-32 bg-gradient-to-b from-card-bg via-app-bg to-card-bg">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp()} className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <Sparkles className="h-3.5 w-3.5" />
            تعمق في الميزات
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            اكتشف قوة منصة UniBot
          </h2>
        </motion.div>

        {/* أزرار التبويب */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {featureTabs.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  activeTab === i
                    ? "bg-royal-blue text-white shadow-lg shadow-royal-blue/25"
                    : "border border-border bg-card-bg text-text-secondary hover:border-royal-blue/30 hover:text-royal-blue"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* محتوى التبويب النشط */}
        <AnimatePresence mode="wait">
          {featureTabs.map((tab, i) => {
            if (i !== activeTab) return null;
            const Icon = tab.icon;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid items-center gap-10 lg:grid-cols-2"
              >
                {/* النص */}
                <div className="order-2 lg:order-1">
                  <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${tab.accent} p-3 shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-navy">{tab.title}</h3>
                  <p className="mb-6 text-text-secondary leading-relaxed">{tab.desc}</p>
                  <ul className="space-y-3">
                    {tab.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 text-sm text-text-secondary">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* العرض البصري — بطاقة محاكاة */}
                <div className={`order-1 lg:order-2 relative rounded-2xl border border-border/50 bg-gradient-to-br ${tab.gradient} p-8 backdrop-blur-sm shadow-xl`}>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-400/60" />
                      <div className="h-2 w-2 rounded-full bg-amber-400/60" />
                      <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                    </div>
                    <span className="text-[10px] text-white/30 font-medium mr-2">{tab.title}</span>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${tab.accent} p-6 text-white shadow-lg`}>
                    <Icon className="mb-3 h-8 w-8 text-white/80" />
                    <h4 className="text-lg font-bold">{tab.title}</h4>
                    <p className="mt-1 text-sm text-white/70">{tab.desc.slice(0, 60)}...</p>
                    <div className="mt-4 flex gap-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-2 flex-1 rounded-full bg-white/20" />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─── Pricing Section ───────────────────────────────────── */
const plans = [
  {
    name: "الباقة الأساسية",
    price: 499,
    currency: "$",
    period: "شهرياً",
    desc: "للمؤسسات الصغيرة والمتوسطة",
    features: ["حتى ١٠٠٠ طالب", "مساعد UniBot", "جداول دراسية ذكية", "إدارة الحضور", "دعم فني عبر البريد"],
    popular: false,
    gradient: "from-royal-blue/10 to-transparent",
    border: "border-border",
    btn: "text-royal-blue border-royal-blue/30",
  },
  {
    name: "الباقة المتقدمة",
    price: 999,
    currency: "$",
    period: "شهرياً",
    desc: "للجامعات متوسطة الحجم",
    features: ["حتى ١٠٠٠٠ طالب", "كل ميزات الأساسية", "تحليلات تنبؤية", "تقارير متقدمة", "دعم فني 24/7", "API مفتوح"],
    popular: true,
    gradient: "from-royal-blue/20 via-peach/10 to-transparent",
    border: "border-royal-blue/40",
    btn: "bg-royal-blue text-white shadow-lg shadow-royal-blue/25",
  },
  {
    name: "الباقة المخصصة",
    price: 1999,
    currency: "$",
    period: "شهرياً",
    desc: "للجامعات الكبيرة والمجمعات",
    features: ["عدد غير محدود من الطلاب", "كل ميزات المتقدمة", "خادم خاص مخصص", "دعم فني مخصص", "SLA مضمون", "تخصيص كامل", "تكامل مع أنظمة الطرف الثالث"],
    popular: false,
    gradient: "from-peach/10 to-transparent",
    border: "border-border",
    btn: "text-royal-blue border-royal-blue/30",
  },
];

function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative px-6 py-24 md:py-32 bg-gradient-to-b from-card-bg via-app-bg to-card-bg">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp()} className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <CreditCard className="h-3.5 w-3.5" />
            خطط الأسعار
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            اختر الخطة المناسبة لمؤسستك
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            ابدأ مجاناً، وارتقِ بمؤسستك عندما تحتاج المزيد.
          </p>

          {/* تبديل شهري/سنوي */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-border bg-card-bg p-1.5 shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${!annual ? "bg-royal-blue text-white shadow" : "text-text-secondary hover:text-royal-blue"}`}
            >
              شهري
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${annual ? "bg-royal-blue text-white shadow" : "text-text-secondary hover:text-royal-blue"}`}
            >
              سنوي
              <span className="mr-1.5 text-[10px] text-emerald-400">وفر ٢٠٪</span>
            </button>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-2xl border-2 bg-card-bg p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular ? "border-royal-blue/40 shadow-lg shadow-royal-blue/10" : plan.border
              }`}
            >
              {/* شارة الأكثر طلباً */}
              {plan.popular && (
                <div className="absolute -left-10 top-6 -rotate-45 bg-gradient-to-r from-royal-blue to-peach px-10 py-1 text-[10px] font-bold text-white shadow">
                  الأكثر طلباً
                </div>
              )}

              <div className={`${plan.popular ? "mt-4" : ""}`}>
                <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{plan.desc}</p>

                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-navy">{plan.currency}{annual ? Math.round(plan.price * 0.8) : plan.price}</span>
                  <span className="mb-1 text-sm text-text-secondary">/{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-text-secondary">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-8 flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-bold transition-all duration-300 hover:shadow-lg ${
                    plan.popular
                      ? "bg-royal-blue text-white border-royal-blue hover:shadow-royal-blue/25"
                      : "text-royal-blue border-royal-blue/30 hover:bg-royal-blue/5"
                  }`}
                >
                  ابدأ الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ Section ───────────────────────────────────────── */
const faqs = [
  { q: "ما هي تقنية RAG التي يستخدمها UniBot؟", a: "UniBot يستخدم تقنية Retrieval-Augmented Generation (RAG) التي تسمح له بالبحث في قاعدة معرفة مؤسستك وإعطاء إجابات دقيقة ومحدثة بناءً على بياناتكم الفعلية — وليس مجرد إجابات عامة." },
  { q: "هل يمكن تخصيص المنصة لتناسب احتياجات جامعتي؟", a: "بالتأكيد. المنصة مصممة لتكون مرنة بالكامل — يمكن تخصيص الحقول، أنواع المستخدمين، الصلاحيات، وحتى شكل التقارير لتناسب هيكل مؤسستك الأكاديمي." },
  { q: "كيف يتم ضمان أمان البيانات؟", a: "نستخدم تشفير AES-256 للبيانات عند التخزين والنقل، ونطبق سياسة العزل التام بين المستأجرين في البنية السحابية. جميع البيانات مشفرة ولا يمكن لأي مؤسسة أخرى الوصول إلى بياناتك." },
  { q: "هل تدعمون أنظمة إدارة التعلم (LMS) الحالية؟", a: "نعم، نوفر API مفتوح يتكامل مع أشهر أنظمة LMS مثل Blackboard و Moodle، بالإضافة إلى إمكانية ربط مخصص مع أنظمتك الحالية عبر REST API." },
  { q: "ما هي متطلبات البدء في استخدام المنصة؟", a: "كل ما تحتاجه هو حساب بريد إلكتروني مؤسسي واتصال بالإنترنت. المنصة سحابية بالكامل — لا تحتاج لخوادم أو تثبيت أي برامج. فقط سجل وانطلق." },
  { q: "هل يوجد دعم فني باللغة العربية؟", a: "نعم، فريق الدعم الفني لدينا متحدث بالعربية ومتاح 24/7 عبر البريد الإلكتروني والواتساب والمكالمات الهاتفية." },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative px-6 py-24 md:py-32 bg-card-bg">
      <div className="mx-auto max-w-3xl">
        <motion.div {...fadeUp()} className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <HelpCircle className="h-3.5 w-3.5" />
            الأسئلة الشائعة
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            لديك سؤال؟ لدينا الجواب
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`group rounded-2xl border border-border transition-all duration-300 cursor-pointer ${
                openIndex === i ? "border-royal-blue/30 bg-royal-blue/[0.02] shadow-md" : "hover:border-border/80 hover:bg-card-bg"
              }`}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <div className="flex items-center justify-between px-6 py-4 sm:px-8">
                <span className="text-sm font-semibold text-navy sm:text-base">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className={`h-4 w-4 shrink-0 transition-colors ${openIndex === i ? "text-royal-blue" : "text-text-secondary"}`} />
                </motion.div>
              </div>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-text-secondary sm:px-8">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Newsletter ────────────────────────────────────────── */
function NewsletterSection() {
  return (
    <section className="relative px-6 py-16 border-t border-border bg-card-bg">
      <div className="mx-auto max-w-2xl text-center">
        <motion.div {...fadeUp()}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <Mail className="h-3.5 w-3.5" />
            ابق على اطلاع
          </div>
          <h3 className="text-2xl font-bold text-navy">اشترك في النشرة البريدية</h3>
          <p className="mt-2 text-sm text-text-secondary">آخر التحديثات، الميزات الجديدة، والعروض الحصرية.</p>
          <div className="mx-auto mt-6 flex max-w-md gap-2">
            <input
              type="email"
              dir="ltr"
              placeholder="بريدك الإلكتروني"
              className="flex-1 rounded-xl border border-border bg-card-bg px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-royal-blue/50 focus:ring-2 focus:ring-royal-blue/10"
            />
            <button className="rounded-xl bg-royal-blue px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:bg-royal-blue/90 hover:shadow-lg">
              اشتراك
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Why UniBot ────────────────────────────────────────── */
const reasons = [
  { icon: Zap, title: "سرعة الأداء", desc: "منصة فائقة السرعة تدعم آلاف المستخدمين المتزامنين." },
  { icon: Shield, title: "أمان من الدرجة الأولى", desc: "تشفير متقدم وعزل كامل للبيانات بين المؤسسات." },
  { icon: Globe, title: "دعم متعدد المستأجرين", desc: "بنية سحابية تدير عدة جامعات من منصة واحدة." },
  { icon: Clock, title: "دعم فني 24/7", desc: "فريق دعم متخصص على مدار الساعة لمساعدتك." },
  { icon: MessageSquare, title: "مساعد ذكي RAG", desc: "نظام RAG يجيب على الأسئلة من قاعدة معرفتك." },
  { icon: TrendingUp, title: "تحليلات تنبؤية", desc: "ذكاء اصطناعي يكتشف الأنماط ويتنبأ بالمخاطر." },
];

function WhySection() {
  return (
    <section className="relative px-6 py-24 md:py-32 bg-card-bg">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp()} className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
            <CheckCircle2 className="h-3.5 w-3.5" />
            لماذا UniBot؟
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy">
            المنصة الأكثر تطوراً لإدارة الجامعات
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-[#F7FAFE]/50 p-5 transition-all duration-300 hover:bg-white hover:border-royal-blue/20 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-royal-blue/10 to-peach/10 text-royal-blue shadow-sm transition-all duration-300 group-hover:from-royal-blue group-hover:to-royal-blue/80 group-hover:text-white group-hover:shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-navy">{reason.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{reason.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Section ───────────────────────────────────────── */
function CTASection() {
  return (
    <section className="relative px-6 py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-royal-blue via-royal-blue/95 to-navy" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(238,164,127,0.15),transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-20 top-1/4 h-60 w-60 rounded-full bg-white/5 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-20 bottom-1/4 h-60 w-60 rounded-full bg-peach/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div {...fadeUp()}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-peach" />
            انطلق معنا
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            استعد لتحويل مؤسستك التعليمية
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-white/70">
            انضم إلى أكثر من ١٠ جامعات تثق في UniBot. ابدأ رحلتك الرقمية اليوم.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-royal-blue shadow-xl shadow-black/10 transition-all duration-300 hover:shadow-2xl hover:scale-[1.03]"
            >
              ابدأ الآن مجاناً
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="group inline-flex items-center gap-2 rounded-2xl border-2 border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:border-white/40 hover:bg-white/5 hover:scale-[1.03]"
            >
              تواصل معنا
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────── */
const footerLinks = [
  { title: "المنصة", items: ["المميزات", "كيف يعمل", "التسعير", "لمن نقدم الخدمة"] },
  { title: "الدعم", items: ["الأسئلة الشائعة", "تواصل معنا", "دليل الاستخدام", "حالة النظام"] },
  { title: "القانوني", items: ["سياسة الخصوصية", "شروط الاستخدام", "سياسة Cookies"] },
];

function FooterSection() {
  return (
    <footer className="border-t border-border bg-card-bg px-6 pt-16 pb-8">
      <div className="mx-auto max-w-7xl">
        {/* Top */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-royal-blue to-peach shadow-md">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-navy">UniBot</span>
            </div>
            <p className="mt-4 text-sm text-text-secondary leading-relaxed">
              منصة أكاديمية ذكية متعددة المستأجرين — نساهم في تحويل التعليم العالي بتقنية الذكاء الاصطناعي.
            </p>
            <div className="mt-5 flex gap-3">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-all duration-200 hover:border-royal-blue/30 hover:text-royal-blue hover:bg-royal-blue/5">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 text-sm font-bold text-navy">{group.title}</h4>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-text-secondary transition-colors duration-200 hover:text-royal-blue">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="mt-12 flex flex-wrap gap-6 border-t border-border pt-6">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Mail className="h-3.5 w-3.5" />
            Ibrahim.UniBot.Support@gmail.com
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Phone className="h-3.5 w-3.5" />
            +967 738281401
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <MapPin className="h-3.5 w-3.5" />
            اليمن — تعز
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-6 text-center text-xs text-text-secondary border-t border-border">
          &copy; {new Date().getFullYear()} UniBot. جميع الحقوق محفوظة. — منصة أكاديمية ذكية متعددة المستأجرين.
        </div>
      </div>
    </footer>
  );
}

/* ─── Navbar ────────────────────────────────────────────── */
function Navbar({ scrolled, mobileOpen, setMobileOpen }: {
  scrolled: boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 dark:bg-navy/80 backdrop-blur-xl shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-royal-blue to-peach shadow-md transition-transform duration-300 group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className={`text-lg font-bold tracking-tight transition-colors duration-300 ${
            scrolled ? "text-navy dark:text-white" : "text-white"
          }`}>
            UniBot
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className={`text-sm font-medium transition-colors hover:text-peach ${
            scrolled ? "text-text-secondary dark:text-white/70" : "text-white/80"
          }`}>
            المميزات
          </a>
          <a href="#how-it-works" className={`text-sm font-medium transition-colors hover:text-peach ${
            scrolled ? "text-text-secondary dark:text-white/70" : "text-white/80"
          }`}>
            كيف يعمل
          </a>
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-xl bg-royal-blue px-5 py-2 text-sm font-semibold text-white shadow-md shadow-royal-blue/20 transition-all duration-300 hover:bg-royal-blue/90 hover:shadow-lg hover:shadow-royal-blue/30"
          >
            تسجيل الدخول
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`rounded-lg p-2 md:hidden transition-colors ${
            scrolled ? "text-navy dark:text-white" : "text-white"
          } hover:bg-white/10`}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-white dark:bg-navy shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              <a href="#features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary dark:text-white/70 hover:bg-[#F7FAFC] dark:hover:bg-white/5 transition-colors">
                المميزات
              </a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary dark:text-white/70 hover:bg-[#F7FAFC] dark:hover:bg-white/5 transition-colors">
                كيف يعمل
              </a>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="mt-2 rounded-xl bg-royal-blue px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md">
                تسجيل الدخول
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ─── Page ──────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-app-bg overflow-hidden">
      <Navbar scrolled={scrolled} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <HeroSection />
      <LogoTickerSection />
      <StatsBannerSection />
      <FeaturesSection />
      <FeatureTabsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <WhySection />
      <PricingSection />
      <CTASection />
      <FAQSection />
      <NewsletterSection />
      <FooterSection />
    </div>
  );
}
