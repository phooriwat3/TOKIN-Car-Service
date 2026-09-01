"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calendar,
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
    title: "แนวทางการขอรับบริการรถรับส่งทำงานล่วงเวลา (OT)",
    description:
      "ระเบียบและแนวทางปฏิบัติสำหรับพนักงานที่ปฏิบัติงานล่วงเวลาหรือวันหยุด เพื่อการวางแผนจัดสรรสายรถและจำนวนยานพาหนะได้อย่างเหมาะสม",
    langTh: "ไทย",
    langEn: "English",
    summaryTitle: "ข้อมูลสรุปสำคัญ (Key Highlights)",
    summaryItems: [
      { label: "เวลาส่งคำขอปกติ", value: "15:30 น.", note: "ระบบปิดรับคำขอเวลา 16:00 น." },
      { label: "ระบบอนุมัติเวลาทำงาน", value: "Tiger OpenSpace", note: "บันทึกคำขอในระบบควบคู่กับการจองรถ" },
      { label: "การยกเลิก / แก้ไข", value: "Manage Link", note: "กดยกเลิกผ่านลิงก์ของตนเองก่อน 16:00 น." },
    ],
    rulesTitle: "ข้อกำหนดและขั้นตอนการปฏิบัติ (Operating Procedures)",
    rules: [
      {
        no: "1",
        title: "กำหนดเวลาส่งคำขอ (Cut-off Time)",
        body: "ระบบเปิดรับคำขอระหว่างเวลา 06:00 – 22:00 น. ส่งคำขอภายใน 15:30 น. เพื่อเข้าสู่รอบจัดรถปกติ โดยระบบปิดรับคำขอเวลา 16:00 น. เพื่อให้ทีมงานธุรการ (GA) จัดเตรียมจำนวนรถตู้และเส้นทางได้อย่างมีประสิทธิภาพ",
      },
      {
        no: "2",
        title: "การเชื่อมโยงกับระบบ Tiger OpenSpace",
        body: "พนักงานต้องยื่นขออนุมัติทำงานล่วงเวลาในระบบ Tiger OpenSpace ด้วยตนเอง โดยสามารถส่งคำขอจองรถรับส่งนี้ได้ทันทีโดยไม่ต้องรอผลอนุมัติใน Tiger OpenSpace ทั้งนี้ฝ่ายธุรการ (GA) จะตรวจสอบความถูกต้องกับรายงานของ Tiger OpenSpace ก่อนปล่อยรถ",
      },
      {
        no: "3",
        title: "การระบุเวลาเลิกงานและจุดส่ง (Routes & Drop-off)",
        body: "โปรดตรวจสอบรอบเวลาเลิกงาน (เช่น 19:00 หรือ 20:00 น.) และเลือกสายรถ/จุดลงให้ตรงกับจุดหมายปลายทาง หากไม่พบจุดลงในระบบ ให้เลือกจุดที่ใกล้เคียงที่สุดและระบุรายละเอียดเพิ่มเติมในช่องหมายเหตุ",
      },
      {
        no: "4",
        title: "การยกเลิกและแก้ไขเที่ยวรถ (Cancellation Policy)",
        body: "หากมีการยกเลิก OT หรือเปลี่ยนแปลงเวลาเลิกงาน กรุณาเปิดลิงก์จัดการคำขอ (Manage Link) เพื่อกดยกเลิกการจองรถก่อนเวลา 16:00 น. เพื่อให้ระบบจัดสรรที่นั่งให้แก่พนักงานท่านอื่นได้อย่างคุ้มค่า",
      },
      {
        no: "5",
        title: "การขึ้นรถและตรวจสอบรายชื่อ (Boarding)",
        body: "รถตู้จะออกเดินทางตรงเวลา ณ จุดจอดรถโรงงาน โปรดมาถึงก่อนเวลาออกเดินทางอย่างน้อย 5 นาที พร้อมเตรียมรหัสพนักงาน 7 หลักเพื่อยืนยันตนกับพนักงานขับรถ",
      },
    ],
    urgentTitle: "หมายเหตุสำหรับคำขอเร่งด่วน (หลัง 16:00 น.)",
    urgentBody:
      "คำขอที่ส่งหลังเวลา 16:00 น. จะถือเป็นคำขอเร่งด่วน (Emergency/Late Request) ซึ่งขึ้นอยู่กับจำนวนที่นั่งและเส้นทางรถที่ว่าง โปรดแจ้งหัวหน้างานและประสานงานกับฝ่ายธุรการ (GA) โดยตรง",
    contactTitle: "ติดต่อสอบถามหรือแจ้งปัญหา",
    contactBody: "ฝ่ายธุรการและยานพาหนะ (General Affairs - Transport)",
    contactAction: "ส่งอีเมลถึงฝ่ายธุรการ (GA)",
  },
  en: {
    headerCategory: "INTERNAL POLICY & GUIDELINES • TOKIN TRANSPORT",
    title: "Overtime (OT) Transport Request Guidelines",
    description:
      "Operating procedures and standard rules for employees requiring transport services during scheduled overtime or holiday shifts.",
    langTh: "ไทย",
    langEn: "English",
    summaryTitle: "Key Highlights",
    summaryItems: [
      { label: "Standard Submission", value: "15:30", note: "Requests close at 16:00" },
      { label: "Work Authorization", value: "Tiger OpenSpace", note: "Submit OT requisition in Tiger OpenSpace system" },
      { label: "Cancellation / Edit", value: "Manage Link", note: "Cancel via your link before 16:00" },
    ],
    rulesTitle: "Operating Procedures & Rules",
    rules: [
      {
        no: "1",
        title: "Daily Submission Cut-off",
        body: "The service window is 06:00–22:00. Submit by 15:30 to enter standard route planning; requests close at 16:00. General Affairs (GA) then optimizes routes and allocates vehicles.",
      },
      {
        no: "2",
        title: "Tiger OpenSpace Work Synchronization",
        body: "Employees must submit overtime requisitions in Tiger OpenSpace. You may submit this transport booking immediately without waiting for approval. GA will verify records with the Tiger OpenSpace report prior to dispatch.",
      },
      {
        no: "3",
        title: "Shift End Time & Drop-off Point",
        body: "Verify your exact shift end time (e.g. 19:00, 20:00) and select the designated route. If your specific stop is not listed, choose the nearest point and specify instructions in the notes field.",
      },
      {
        no: "4",
        title: "Cancellation & Schedule Changes",
        body: "If your overtime is cancelled or postponed, please use your Manage Link to cancel the vehicle request before 16:00 so seats can be reallocated.",
      },
      {
        no: "5",
        title: "Boarding & Identity Verification",
        body: "Vans depart on schedule from the factory dispatch area. Please arrive 5 minutes prior to departure and be prepared to state your 7-digit Employee ID to the driver.",
      },
    ],
    urgentTitle: "Late Requests (After 16:00)",
    urgentBody:
      "Submissions after 16:00 are treated as urgent requests subject to vehicle capacity. Please notify your supervisor and contact General Affairs (GA) directly.",
    contactTitle: "Need Assistance?",
    contactBody: "General Affairs & Fleet Management Team",
    contactAction: "Contact GA via Outlook",
  },
} as const;

type Language = keyof typeof translations;

export function OtGuidelines() {
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={18} />
            <div>
              <p className="font-bold text-amber-950">{lang === "th" ? "ก่อนส่งคำขอ OT Transport" : "Before you request Overtime Transport"}</p>
              <p className="mt-1 text-sm leading-6 text-amber-900">{lang === "th" ? "ส่งคำขอภายใน 15:30 น. ระบบปิด 16:00 น. และต้องยื่น OT ใน Tiger OpenSpace ก่อน" : "Submit by 15:30; requests close at 16:00. Submit your OT in Tiger OpenSpace first."}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">{lang === "th" ? "ตรวจสอบก่อนเริ่ม" : "Quick checklist"}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[lang === "th" ? "ยื่น OT ใน Tiger OpenSpace" : "Submit OT in Tiger OpenSpace", lang === "th" ? "เลือกเวลาเลิกงานและจุดลงรถ" : "Confirm shift end time and drop-off", lang === "th" ? "บันทึก Manage Link หลังส่งคำขอ" : "Save your Manage Link after submitting"].map((item) => (
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
              href="https://outlook.office.com/mail/deeplink/compose?to=Treebuppha.Saraphan@yageo.com&subject=TOKIN%20OT%20Transport%20Inquiry"
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
