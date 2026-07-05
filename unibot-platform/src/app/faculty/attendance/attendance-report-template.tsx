"use client";

import { useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ReportRow {
  student_id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  total_sessions: number;
  attended: number;
  unexcused_absences: number;
  excused_absences: number;
  absence_limit_count: number;
  remaining_absences: number;
  is_dismissed: boolean;
}

interface ReportData {
  tenantName: string;
  tenantLogo: string | null;
  courseName: string;
  courseCode: string;
  semesterName: string;
  academicYear: string;
  totalSessions: number;
  totalStudents: number;
  totalDismissed: number;
  absenceLimitCount: number;
  rows: ReportRow[];
  dismissed: ReportRow[];
  generatedAt: string;
}

export function useAttendanceReport() {
  const templateRef = useRef<HTMLDivElement>(null);

  async function generatePdf(data: ReportData) {
    const toastId = toast.loading("جاري تجهيز التقرير...");

    try {
      // Create a temporary container for rendering
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "1100px";
      container.style.background = "#ffffff";
      container.dir = "rtl";
      document.body.appendChild(container);

      // Render the template HTML directly
      container.innerHTML = buildReportHtml(data);

      // Wait for fonts and images to load
      await new Promise((r) => setTimeout(r, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: 1100,
        height: container.scrollHeight,
        windowHeight: container.scrollHeight,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = 297;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`تقرير_الحضور_${data.courseCode}_${new Date().toISOString().split("T")[0]}.pdf`);

      toast.dismiss(toastId);
      toast.success("✅ تم تحميل التقرير بنجاح");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("فشل إنشاء التقرير: " + (err instanceof Error ? err.message : "خطأ غير متوقع"));
    }
  }

  return { generatePdf, templateRef };
}

function buildReportHtml(data: ReportData): string {
  const dateStr = new Date(data.generatedAt).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mainRowsHtml = data.rows
    .map(
      (r, i) => `
      <tr style="${i % 2 === 0 ? "background:#f8fafc" : "background:#fff"}">
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;">${r.first_name} ${r.last_name}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;direction:ltr">${r.student_number}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${r.total_sessions}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;color:#16a34a;font-weight:bold;">${r.attended}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;color:#dc2626;font-weight:bold;">${r.unexcused_absences}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${r.excused_absences}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;${r.is_dismissed || r.remaining_absences <= 0 ? "color:#dc2626;font-weight:bold;" : r.remaining_absences <= 2 ? "color:#d97706;font-weight:bold;" : ""}">${r.unexcused_absences} / ${r.absence_limit_count}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;${r.is_dismissed ? "color:#dc2626;font-weight:bold;" : r.remaining_absences <= 2 ? "color:#d97706;" : "color:#16a34a;"}">${r.is_dismissed ? "محروم" : r.remaining_absences > 0 ? `${r.remaining_absences}` : "—"}</td>
      </tr>`
    )
    .join("");

  const dismissedRowsHtml = data.dismissed.length
    ? data.dismissed
        .map(
          (r, i) => `
        <tr style="${i % 2 === 0 ? "background:#fef2f2" : "background:#fff"}">
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${r.first_name} ${r.last_name}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;direction:ltr">${r.student_number}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${r.total_sessions}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${r.unexcused_absences}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;color:#dc2626;font-weight:bold;">${r.unexcused_absences} / ${r.absence_limit_count}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="6" style="padding:10px;text-align:center;color:#666;">لا يوجد طلاب محرومون</td></tr>`;

  return `
  <div style="direction:rtl;font-family:'DejaVu Sans',tahoma,arial,sans-serif;padding:20px;color:#1a202c;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #00539c;">
      ${data.tenantLogo ? `<img src="${data.tenantLogo}" style="height:60px;margin-bottom:8px;" />` : ""}
      <h1 style="margin:0;font-size:22px;color:#00539c;">${data.tenantName}</h1>
      <h2 style="margin:5px 0;font-size:16px;color:#333;">تقرير كشف الحضور والحرمان الأكاديمي</h2>
    </div>

    <!-- Course Info -->
    <table style="width:100%;margin-bottom:15px;font-size:13px;">
      <tr>
        <td style="width:50%;"><strong>المادة:</strong> ${data.courseCode} — ${data.courseName}</td>
        <td style="width:50%;text-align:left;"><strong>تاريخ التقرير:</strong> ${dateStr}</td>
      </tr>
      <tr>
        <td><strong>الفصل الدراسي:</strong> ${data.semesterName} ${data.academicYear}</td>
        <td style="text-align:left;"><strong>إجمالي الجلسات:</strong> ${data.totalSessions}</td>
      </tr>
      <tr>
        <td><strong>إجمالي الطلاب:</strong> ${data.totalStudents}</td>
        <td style="text-align:left;${data.totalDismissed > 0 ? "color:#dc2626;font-weight:bold;" : ""}"><strong>المحرومون:</strong> ${data.totalDismissed}</td>
      </tr>
    </table>

    <!-- Table 1: General Attendance -->
    <h3 style="font-size:14px;margin:15px 0 8px;padding:8px 12px;background:#00539c;color:#fff;border-radius:4px;">أولاً: كشف الحضور العام</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;">
      <thead>
        <tr style="background:#1e293b;color:#fff;">
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">#</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">اسم الطالب</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">الرقم الجامعي</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">إجمالي الجلسات</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">حاضر</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">غائب</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">معذور</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">الغياب / الحد</th>
          <th style="padding:7px 8px;border:1px solid #1e293b;text-align:center;">المتبقي</th>
        </tr>
      </thead>
      <tbody>
        ${mainRowsHtml}
      </tbody>
    </table>

    <!-- Table 2: Dismissed Students -->
    <h3 style="font-size:14px;margin:15px 0 8px;padding:8px 12px;background:#dc2626;color:#fff;border-radius:4px;">ثانياً: قائمة الطلاب المحرومين</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:25px;">
      <thead>
        <tr style="background:#991b1b;color:#fff;">
          <th style="padding:7px 8px;border:1px solid #991b1b;text-align:center;">#</th>
          <th style="padding:7px 8px;border:1px solid #991b1b;text-align:center;">اسم الطالب</th>
          <th style="padding:7px 8px;border:1px solid #991b1b;text-align:center;">الرقم الجامعي</th>
          <th style="padding:7px 8px;border:1px solid #991b1b;text-align:center;">إجمالي الجلسات</th>
          <th style="padding:7px 8px;border:1px solid #991b1b;text-align:center;">عدد مرات الغياب</th>
          <th style="padding:7px 8px;border:1px solid #991b1b;text-align:center;">الغياب / الحد</th>
        </tr>
      </thead>
      <tbody>
        ${dismissedRowsHtml}
      </tbody>
    </table>

    <!-- Footer: Signatures -->
    <div style="margin-top:30px;padding-top:15px;border-top:2px solid #ddd;">
      <table style="width:100%;font-size:13px;">
        <tr>
          <td style="width:45%;text-align:center;">
            <div style="margin-bottom:40px;">____________________</div>
            <strong>توقيع المحاضر</strong>
          </td>
          <td style="width:10%;"></td>
          <td style="width:45%;text-align:center;">
            <div style="margin-bottom:40px;">____________________</div>
            <strong>توقيع رئيس القسم</strong>
          </td>
        </tr>
      </table>
      <p style="text-align:center;margin-top:20px;font-size:11px;color:#999;">
        تم إنشاء هذا التقرير آلياً بواسطة نظام UniBot — ${dateStr}
      </p>
    </div>
  </div>`;
}
