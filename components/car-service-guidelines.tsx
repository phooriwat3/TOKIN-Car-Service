"use client";

import { useState } from "react";
import {
  AlertCircle,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  HelpCircle,
  Mail,
  MapPin,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const translations = {
  th: {
    headerCategory: "ข้อกำหนดและนโยบายภายใน • TOKIN TRANSPORT",
    title: "แนวทางการขอใช้รถยนต์ส่วนกลางไปปฏิบัติงาน (Off-site Business Transport)",
    description:
      "ระเบียบและแนวทางปฏิบัติสำหรับการขอใช้รถยนต์ของบริษัทฯ และพนักงานขับรถ เพื่อการเดินทางไปติดต่องานภายนอกสถานที่อย่างปลอดภัยและเป็นไปตามขั้นตอน",
    langTh: "ไทย",
    langEn: "English",
    summaryTitle: "ข้อมูลสรุปสำคัญ (Key Highlights)",
    summaryItems: [
      { label: "กำหนดเวลาส่งคำขอล่วงหน้า", value: "24 ชั่วโมง", note: "ส่งล่วงหน้าก่อนวันเดินทางอย่างน้อย 1 วันทำการ" },
      { label: "ขั้นตอนการอนุมัติ", value: "Department Approver", note: "ต้องได้รับการอนุมัติจากหัวหน้าแผนกก่อนจัดรถ" },
      { label: "การมอบหมายรถและคนขับ", value: "GA Fleet Dispatch", note: "GA จะส่งข้อมูลทะเบียนรถและคนขับทางอีเมล" },
    ],
    rulesTitle: "ข้อกำหนดและขั้นตอนการปฏิบัติ (Operating Procedures)",
    rules: [
      {
        no: "1",
        title: "การส่งคำขอล่วงหน้า (Advance Requisition)",
        body: "กรุณาส่งคำขอล่วงหน้าอย่างน้อย 24 ชั่วโมง (หรือ 1 วันทำการก่อนการเดินทาง) เพื่อให้ทีมงานธุรการ (GA) ตรวจสอบความพร้อมของรถยนต์และจัดตารางพนักงานขับรถได้อย่างมีประสิทธิภาพ",
      },
      {
        no: "2",
        title: "การอนุมัติจากผู้จัดการแผนก (Approver Workflow)",
        body: "ผู้ขอต้องเลือกผู้มีอำนาจอนุมัติ (Department Manager/Approver) ให้ถูกต้อง ระบบจะส่งลิงก์อนุมัติไปยังอีเมลของผู้อนุมัติทันที ทั้งนี้การจัดรถจะเริ่มดำเนินการเมื่อได้รับการอนุมัติเรียบร้อยแล้วเท่านั้น",
      },
      {
        no: "3",
        title: "วัตถุประสงค์การใช้งาน (Authorized Business Purpose)",
        body: "การขอใช้รถส่วนกลางต้องเป็นไปเพื่อกิจการของบริษัทฯ เท่านั้น เช่น การติดต่อลูกค้า, เยี่ยมชมคู่ค้า/ซัพพลายเออร์, ติดต่องานราชการ หรือการเดินทางไปปฏิบัติงานระหว่างโรงงาน/สาขา",
      },
      {
        no: "4",
        title: "การระบุจุดรับ-ส่งและผู้โดยสาร (Passenger Details & Meeting Point)",
        body: "โปรดระบุจุดนัดพบ (เช่น หน้าโรงงาน หรือ Loading Area) สถานที่ปลายทาง และจำนวนผู้โดยสารให้ชัดเจน เพื่อให้ฝ่ายธุรการสามารถจัดสรรขนาดของยานพาหนะ (รถเก๋ง / รถตู้) ได้อย่างเหมาะสม",
      },
      {
        no: "5",
        title: "การยกเลิกหรือเปลี่ยนแปลงการเดินทาง (Cancellation Policy)",
        body: "หากมีการเลื่อนเวลาหรือยกเลิกการเดินทาง กรุณากดยกเลิกผ่านลิงก์จัดการคำขอ (Manage Link) หรือแจ้งฝ่ายธุรการ (GA) ล่วงหน้าอย่างน้อย 2 ชั่วโมง เพื่อคืนตารางงานของคนขับรถ",
      },
    ],
    urgentTitle: "กรณีเดินทางเร่งด่วน / ฉุกเฉิน (Urgent Booking)",
    urgentBody:
      "กรณีมีภารกิจด่วนที่ไม่สามารถส่งคำขอล่วงหน้า 24 ชม. ได้ หลังจากยื่นคำขอในระบบแล้ว โปรดติดต่อประสานงานกับผู้จัดการแผนกเพื่อกดอนุมัติ และโทรแจ้งฝ่ายธุรการ (GA) ทันที",
    contactTitle: "ติดต่อฝ่ายธุรการและยานพาหนะ",
    contactBody: "General Affairs - Fleet & Car Service Operations",
    contactAction: "ส่งอีเมลถึงฝ่ายธุรการ (GA)",
  },
  en: {
    headerCategory: "INTERNAL POLICY & GUIDELINES • TOKIN TRANSPORT",
    title: "Off-site Business Transport Guidelines",
    description:
      "Standard operating procedures and policy guidelines for requesting company business vehicles and drivers for official off-site business travel.",
    langTh: "ไทย",
    langEn: "English",
    summaryTitle: "Key Highlights",
    summaryItems: [
      { label: "Advance Notice Period", value: "24 Hours", note: "Submit at least 1 working day before travel" },
      { label: "Approval Requirement", value: "Department Approver", note: "Manager email approval required before dispatch" },
      { label: "Vehicle & Driver", value: "GA Fleet Dispatch", note: "Confirmation sent to requester via email" },
    ],
    rulesTitle: "Operating Procedures & Rules",
    rules: [
      {
        no: "1",
        title: "Advance Requisition Window",
        body: "Please submit your requisition at least 24 hours (1 working day) prior to the travel date to allow General Affairs (GA) to verify fleet availability and schedule drivers.",
      },
      {
        no: "2",
        title: "Department Manager Approval",
        body: "Select your designated Department Approver. An approval notification will be automatically emailed to them. Vehicle and driver assignment proceeds only after manager approval is confirmed.",
      },
      {
        no: "3",
        title: "Authorized Business Purpose",
        body: "Off-site business transport is restricted to official company business, including client meetings, vendor audits, government agency liaison, and inter-plant travel.",
      },
      {
        no: "4",
        title: "Passenger Details & Meeting Point",
        body: "Specify the meeting point (Front Area or Loading Area), exact destination, and passenger count so GA can assign the appropriate vehicle class (Sedan / Van).",
      },
      {
        no: "5",
        title: "Cancellation & Schedule Changes",
        body: "If your trip is postponed or cancelled, use your Manage Link to cancel or inform GA at least 2 hours in advance to release the driver schedule.",
      },
    ],
    urgentTitle: "Urgent / Same-day Requests",
    urgentBody:
      "For urgent trips where 24-hour advance notice is not feasible, please follow up with your Department Approver for immediate email approval and notify GA Transport directly.",
    contactTitle: "Need Assistance?",
    contactBody: "General Affairs & Fleet Management Operations",
    contactAction: "Contact GA via Outlook",
  },
} as const;

type Language = keyof typeof translations;

export function CarServiceGuidelines() {
  const [lang, setLang] = useState<Language>("th");
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const t = translations[lang];

  return (
    <div className="bg-white text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-900 px-6 py-6 text-white sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              {t.headerCategory}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t.title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              {t.description}
            </p>
          </div>

          {/* Clean Language Segment */}
          <div className="flex shrink-0 items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5 sm:mr-10">
            <button
              type="button"
              onClick={() => setLang("th")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                lang === "th"
                  ? "bg-brand text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t.langTh}
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                lang === "en"
                  ? "bg-brand text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t.langEn}
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {t.summaryItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-800/80 p-3.5"
            >
              <span className="text-[11px] font-medium text-slate-400">
                {item.label}
              </span>
              <p className="mt-0.5 text-base font-bold text-white">
                {item.value}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {item.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-blue-700" size={18} />
            <div>
              <p className="font-bold text-blue-950">{lang === "th" ? "ก่อนส่งคำขอ Off-site Business Transport" : "Before you request Off-site Business Transport"}</p>
              <p className="mt-1 text-sm leading-6 text-blue-900">{lang === "th" ? "ส่งคำขอล่วงหน้าอย่างน้อย 24 ชั่วโมง และเลือกผู้อนุมัติของแผนกให้ถูกต้อง" : "Submit at least 24 hours in advance and choose the correct Department Approver."}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">{lang === "th" ? "ตรวจสอบก่อนเริ่ม" : "Quick checklist"}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[lang === "th" ? "ส่งคำขอล่วงหน้า 1 วันทำการ" : "Submit one working day ahead", lang === "th" ? "ระบุจุดรับและปลายทางให้ชัดเจน" : "Confirm pickup and destination", lang === "th" ? "เลือกผู้อนุมัติของแผนก" : "Choose your Department Approver"].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />{item}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">{lang === "th" ? "รายละเอียดนโยบาย" : "Full policy details"}</h3>
          <p className="mt-1 text-xs text-slate-500">{lang === "th" ? "เปิดเฉพาะหัวข้อที่ต้องการอ่าน" : "Open a topic only when you need more detail."}</p>
          <div className="mt-3 divide-y overflow-hidden rounded-xl border border-slate-200">
            {t.rules.map((rule) => (
              <div key={rule.no}>
                <button type="button" onClick={() => setExpandedRule((current) => current === rule.no ? null : rule.no)} aria-expanded={expandedRule === rule.no} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{rule.no}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-900">{rule.title}</span>
                  <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${expandedRule === rule.no ? "rotate-180" : ""}`} />
                </button>
                {expandedRule === rule.no && <p className="border-t bg-slate-50 px-4 py-3 pl-12 text-xs leading-6 text-slate-600 sm:text-sm">{rule.body}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Notice & Contact Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900">
            <p className="font-semibold text-amber-950 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-700 shrink-0" />
              {t.urgentTitle}
            </p>
            <p className="mt-1.5 text-amber-900/90">{t.urgentBody}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs flex flex-col justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-slate-600 shrink-0" />
                {t.contactTitle}
              </p>
              <p className="mt-1 text-slate-600">{t.contactBody}</p>
            </div>
            <a
              href="https://outlook.office.com/mail/deeplink/compose?to=Treebuppha.Saraphan@yageo.com&subject=TOKIN%20Car%20Service%20Inquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark hover:underline"
            >
              <Mail size={13} />
              <span>{t.contactAction}</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
