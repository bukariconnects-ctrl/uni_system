"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import InfiniteMarquee from "@/components/ui/infinite-marquee";
import {
  Sparkles,
  Calendar,
  BarChart3,
  Shield,
  ArrowLeft,
  ChevronDown,
  GraduationCap,
  Bot,
  BookOpen,
  Users,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" as const },
  transition: { duration: 0.6, ease: "easeOut" as const, delay },
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.92]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: Bot,
      title: "المساعد الافتراضي UniBot",
      desc: "مساعد ذكي يعتمد على RAG يجب على استفسارات الطلاب والمحاضرين من قاعدة معرفة مؤسستك.",
      gradient: "from-royal-blue to-royal-blue/70",
      glow: "group-hover:shadow-royal-blue/20",
      wide: false,
    },
    {
      icon: Calendar,
      title: "الجداول الذكية",
      desc: "نظام جدولة متقدم يكتشف التعارضات ويوزع القاعات تلقائياً دون تداخل.",
      gradient: "from-royal-blue to-peach",
      glow: "group-hover:shadow-royal-blue/20",
      wide: false,
    },
    {
      icon: BarChart3,
      title: "التحليل التنبؤي",
      desc: "نظام إنذار مبكر يكتشف الطلاب المعرضين للخطر قبل فوات الأوان.",
      gradient: "from-peach to-peach/70",
      glow: "group-hover:shadow-peach/20",
      wide: false,
    },
    {
      icon: Shield,
      title: "العزل السحابي الآمن",
      desc: "بنية متعددة المستأجرين تعزل بيانات كل جامعة بمعايير أمان صارمة.",
      gradient: "from-royal-blue to-peach",
      glow: "group-hover:shadow-royal-blue/20",
      wide: true,
    },
  ];

  const steps = [
    { num: "01", icon: Building, title: "تهيئة الجامعة", desc: "أنشئ حساب مؤسستك وحدد هيكلك الأكاديمي في دقائق." },
    { num: "02", icon: BookOpen, title: "إدارة المقررات", desc: "وزع المحاضرين والطلاب، أنشئ الجداول والتكاليف." },
    { num: "03", icon: Users, title: "تجربة الطالب الذكية", desc: "الطلاب يستخدمون UniBot ويتابعون حضورهم ودرجاتهم." },
  ];

  return (
    <div className="relative min-h-screen bg-[#F7FAFC] overflow-hidden">
      {/* Navbar */}
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-[#E2E8F0]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-royal-blue to-peach shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1A202C]">
              UniBot
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className={`text-sm font-medium transition-colors hover:text-royal-blue ${
                scrolled ? "text-[#4A5568]" : "text-[#4A5568]"
              }`}
            >
              المميزات
            </a>
            <a
              href="#how-it-works"
              className={`text-sm font-medium transition-colors hover:text-royal-blue ${
                scrolled ? "text-[#4A5568]" : "text-[#4A5568]"
              }`}
            >
              كيف يعمل
            </a>
            <Link
              href="/login"
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                scrolled
                  ? "bg-royal-blue text-white hover:bg-royal-blue/90 shadow-md hover:shadow-lg"
                  : "bg-royal-blue text-white hover:bg-royal-blue/90 shadow-md"
              }`}
            >
              تسجيل الدخول
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`rounded-lg p-2 md:hidden text-[#1A202C]`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-[#E2E8F0] bg-white px-6 py-4 shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[#4A5568] hover:bg-[#F7FAFC]">
                المميزات
              </a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[#4A5568] hover:bg-[#F7FAFC]">
                كيف يعمل
              </a>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-xl bg-royal-blue px-4 py-2.5 text-center text-sm font-semibold text-white">
                تسجيل الدخول
              </Link>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Hero Section */}
      <motion.section style={{ opacity: heroOpacity, scale: heroScale }} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
        {/* Subtle gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7FAFC] via-white to-[#F7FAFC]" />
        {/* Decorative Royal Blue & Peach blobs */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-royal-blue blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-peach blur-3xl animate-pulse" style={{ animationDuration: "8s", animationDelay: "1s" }} />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-royal-blue/60 blur-3xl animate-pulse" style={{ animationDuration: "7s", animationDelay: "2s" }} />
        </div>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #00539C 1px, transparent 0)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-peach/20 bg-peach/10 px-4 py-1.5 text-sm font-medium text-peach backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-peach" />
              منصة أكاديمية ذكية متعددة المستأجرين
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-4xl font-extrabold leading-tight text-royal-blue sm:text-5xl md:text-6xl lg:text-7xl"
          >
            مستقبل الإدارة الجامعية،
            <span className="mt-2 block bg-gradient-to-r from-royal-blue to-peach bg-clip-text text-transparent">
              مدعوماً بالذكاء الاصطناعي
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#4A5568] sm:text-xl"
          >
            منصة شاملة تدير الجامعات والمؤسسات التعليمية — من الجداول الدراسية والحضور إلى المساعد الذكي
            والتحليلات التنبؤية — كل ذلك في نظام سحابي آمن ومتعدد المستأجرين.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-2xl bg-royal-blue px-8 py-3.5 text-base font-bold text-white shadow-xl transition-all duration-200 hover:shadow-2xl hover:shadow-royal-blue/25 hover:scale-[1.02]"
            >
              تسجيل الدخول
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 rounded-2xl border border-royal-blue/20 bg-white px-8 py-3.5 text-base font-semibold text-royal-blue shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
            >
              استكشف المميزات
              <ChevronDown className="h-4 w-4" />
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-16"
          >
            {[
              { label: "جامعة", value: "+10" },
              { label: "طالب", value: "+5,000" },
              { label: "محاضر", value: "+200" },
              { label: "نسبة رضا", value: "98%" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-royal-blue sm:text-3xl">{stat.value}</p>
                <p className="text-sm text-[#718096]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mb-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
              <Sparkles className="h-3.5 w-3.5" />
              مميزات المنصة
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1A202C] sm:text-4xl">
              كل ما تحتاجه لإدارة مؤسستك التعليمية
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[#718096]">
              أدوات متكاملة تغطي جميع احتياجات الجامعة — من الإدارة إلى التدريس إلى تجربة الطالب.
            </p>
          </motion.div>

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
                  className={`group relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white/80 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${feature.glow} ${
                    feature.wide ? "sm:col-span-2" : ""
                  }`}
                >
                  {/* Gradient hover overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]`} />

                  <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.gradient} p-3 shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[#1A202C]">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-[#718096]">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Screenshot Marquee */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp(0.15)} className="mb-14 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-royal-blue/10 px-4 py-1.5 text-sm font-medium text-royal-blue">
              <Sparkles className="h-3.5 w-3.5" />
              نظرة من الداخل
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1A202C] sm:text-4xl">
              تجربة المنصة مباشرة
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[#718096]">
              واجهة عصرية سهلة الاستخدام — من لوحات التحكم إلى التقارير والمساعد الذكي.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-col gap-6">
          <InfiniteMarquee
            direction="left"
            speed="slow"
            images={[
              { src: "https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=640&q=80", alt: "طالب في قاعة الدراسة" },
              { src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=640&q=80", alt: "طلاب في الجامعة" },
              { src: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=640&q=80", alt: "محاضرة جامعية" },
              { src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=640&q=80", alt: "فريق عمل" },
              { src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=640&q=80", alt: "اجتماع عمل" },
            ]}
          />
          <InfiniteMarquee
            direction="right"
            speed="slow"
            images={[
              { src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=640&q=80", alt: "خريجون" },
              { src: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=640&q=80", alt: "مكتبة جامعية" },
              { src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=640&q=80", alt: "طالب يدرس" },
              { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=640&q=80", alt: "فصل دراسي" },
              { src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&q=80", alt: "قاعة محاضرات" },
            ]}
          />
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative px-6 py-24 md:py-32 bg-white">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp(0.15)} className="mb-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-peach/20 px-4 py-1.5 text-sm font-medium text-peach">
              <BookOpen className="h-3.5 w-3.5" />
              خطوات بسيطة
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1A202C] sm:text-4xl">
              ابدأ في ثلاث خطوات
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[#718096]">
              من التهيئة إلى التشغيل الكامل — منصتك جاهزة في أسرع وقت.
            </p>
          </motion.div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connecting line */}
            <div className="absolute right-1/4 top-12 hidden h-0.5 w-1/2 bg-gradient-to-r from-royal-blue to-peach md:block" />

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
                  <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-royal-blue to-royal-blue/80 text-white shadow-lg shadow-royal-blue/20">
                    <Icon className="h-7 w-7" />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-peach text-xs font-bold text-white shadow">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-[#1A202C]">{step.title}</h3>
                  <p className="max-w-xs text-sm text-[#718096]">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-royal-blue to-peach shadow-md">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#1A202C]">UniBot</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#718096]">
              <Link href="/login" className="hover:text-royal-blue transition-colors">تسجيل الدخول</Link>
              <a href="#features" className="hover:text-royal-blue transition-colors">المميزات</a>
              <a href="#how-it-works" className="hover:text-royal-blue transition-colors">كيف يعمل</a>
            </div>
          </div>
          <div className="mt-8 border-t border-[#E2E8F0] pt-6 text-center text-xs text-[#718096]">
            &copy; {new Date().getFullYear()} UniBot. جميع الحقوق محفوظة. — منصة أكاديمية ذكية متعددة المستأجرين.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Building(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M12 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}
