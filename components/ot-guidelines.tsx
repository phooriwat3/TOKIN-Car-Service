"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
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
    eyebrow: "นโยบายและแนวทางปฏิบัติ — TOKIN TRANSPORT",
    title: "แนวทางและกฎการขอรถรับส่งทำงานล่วงเวลา (OT)",
    subtitle:
      "ข้อมูลสำคัญและข้อกำหนดในการจองรถรับส่งสำหรับพนักงานที่ปฏิบัติงานล่วงเวลาหรือวันหยุด เพื่อการจัดสรรรถอย่างมีประสิทธิภาพ",
    stats: [
      { label: "เวลาตัดรอบประจำวัน (Cut-off)", value: "16:00 น.", desc: "ส่งคำขอก่อนเวลานี้เพื่อเข้าสู่รอบจัดรถปกติ" },
      { label: "ระบบยื่น OT ล่วงหน้า", value: "Tiger Space", desc: "ยื่นคำขอในระบบควบคู่กับการจองรถรับส่ง" },
      { label: "ยกเลิก / เปลี่ยนแปลง", value: "Manage Link", desc: "กดยกเลิกผ่านลิงก์คำขอก่อน 16:00 น." },
    ],
    rulesHeading: "5 ข้อกำหนดสำคัญในการใช้บริการรถรับส่ง OT",
    rulesSubheading: "โปรดอ่านและปฏิบัติตามแนวทางด้านล่างเพื่อให้การเดินทางเป็นไปอย่างราบรื่น",
    rules: [
      {
        number: "01",
        icon: Clock,
        title: "รอบเวลาส่งคำขอ (Daily Submission Window)",
        summary: "เปิดรับคำขอ 06:00 - 22:00 น. โดยมีรอบตัดเวลาจัดรถปกติที่ 16:00 น.",
        details:
          "พนักงานควรส่งคำขอจองรถรับส่งก่อนเวลา 16:00 น. ของวันทำงาน เพื่อให้ทีมยานพาหนะ (GA) รวบรวมข้อมูล จัดเส้นทาง และจัดสรรจำนวนรถตู้ได้อย่างเพียงพอ",
        badge: "ตัดรอบ 16:00 น.",
        badgeVariant: "amber",
      },
      {
        number: "02",
        icon: ShieldCheck,
        title: "การบันทึกข้อมูลในระบบ Tiger Space",
        summary: "ยื่นคำขอทำ OT ใน Tiger Space ควบคู่กับการจองรถ",
        details:
          "พนักงานสามารถส่งคำขอรถรับส่งในเว็บนี้ได้ทันทีโดยไม่ต้องรอให้อนุมัติใน Tiger Space เสร็จสิ้น โดยฝ่าย GA จะนำข้อมูลไปตรวจสอบความถูกต้องกับระบบ Tiger Space ก่อนปล่อยรถ",
        badge: "ไม่ต้องรออนุมัติก่อน",
        badgeVariant: "blue",
      },
      {
        number: "03",
        icon: MapPin,
        title: "การเลือกสายรถและจุดส่ง (Routes & Drop-off)",
        summary: "เลือกรอบเวลาเลิกงานและจุดลงที่ตรงกับจุดหมายจริง",
        details:
          "โปรดตรวจสอบรอบเวลาเลิกงาน (เช่น 19:00 หรือ 20:00 น.) และเลือกสายรถ/จุดลงให้ถูกต้อง หากไม่มีจุดลงในรายการ ให้เลือกจุดลงใกล้เคียงและระบุรายละเอียดในช่องหมายเหตุเพิ่มเติม",
        badge: "ระบุจุดส่งให้ชัดเจน",
        badgeVariant: "slate",
      },
      {
        number: "04",
        icon: UserCheck,
        title: "การยกเลิกหรือแก้ไขคำขอ (Cancellation Policy)",
        summary: "ยกเลิกคำขอก่อน 16:00 น. หากไม่มีการทำ OT แล้ว",
        details:
          "หากมีเหตุจำเป็นต้องยกเลิก OT หรือเปลี่ยนแปลงเวลาทำงาน กรุณาใช้ลิงก์ในหน้าจัดการคำขอ (Manage Link) เพื่อกดยกเลิกรถก่อนเวลา 16:00 น. เพื่อคืนโควตาที่นั่งให้เพื่อนร่วมงานท่านอื่น",
        badge: "แจ้งล่วงหน้าก่อน 16:00",
        badgeVariant: "red",
      },
      {
        number: "05",
        icon: Bus,
        title: "การขึ้นรถและการยืนยันตัวตน (Boarding)",
        summary: "พร้อมขึ้นรถก่อนเวลา 5 นาที ณ จุดจอดรถโรงงาน",
        details:
          "รถตู้จะออกเดินทางตรงเวลาตามรอบที่กำหนด โปรดเตรียมรหัสพนักงาน 7 หลัก เพื่อยืนยันรายชื่อกับคนขับรถก่อนขึ้นรถ",
        badge: "ตรงต่อเวลา",
        badgeVariant: "green",
      },
    ],
    checklistTitle: "สรุปขั้นตอนก่อนเดินทาง",
    checklistDesc: "เช็คลิสต์ 4 สเต็ปง่ายๆ สำหรับพนักงาน",
    checklist: [
      "1. ยื่นขอ OT ใน Tiger Space",
      "2. ส่งคำขอจองรถในเว็บนี้ก่อน 16:00 น.",
      "3. บันทึก Manage Link หรือจำเลขคำขอไว้",
      "4. มาถึงจุดขึ้นรถก่อนเวลาออก 5 นาที",
    ],
    alertTitle: "กรณีคำขอฉุกเฉิน (หลัง 16:00 น.)",
    alertBody:
      "คำขอที่ส่งหลังเวลา 16:00 น. จะถูกจัดเป็นกรณีเร่งด่วน (Urgent Request) ซึ่งอาจมีข้อจำกัดเรื่องที่นั่งและเส้นทาง โปรดประสานงานแจ้งหัวหน้างานและติดต่อฝ่าย GA ทันที",
    helpTitle: "ต้องการความช่วยเหลือเพิ่มเติม?",
    helpDesc: "หากมีข้อสงสัยเรื่องสายรถ จุดส่ง หรือกรณีฉุกเฉิน สามารถติดต่อทีมงานธุรการ (GA) ได้โดยตรง",
    contactButton: "ติดต่อฝ่ายธุรการ (GA Transport)",
  },
  en: {
    eyebrow: "POLICY & OPERATING GUIDELINES — TOKIN TRANSPORT",
    title: "Overtime (OT) Transport Rules & Guidelines",
    subtitle:
      "Key requirements and operating procedures for employee overtime and holiday work transportation to ensure safe and efficient fleet dispatching.",
    stats: [
      { label: "Daily Batch Cut-off", value: "16:00", desc: "Submit before 16:00 for normal transport batch allocation" },
      { label: "OT Work System", value: "Tiger Space", desc: "Submit OT in Tiger Space alongside transport request" },
      { label: "Cancel / Update", value: "Manage Link", desc: "Cancel via your direct link before 16:00" },
    ],
    rulesHeading: "5 Core Transport Operating Rules",
    rulesSubheading: "Please review and follow these operational standards before submitting your request",
    rules: [
      {
        number: "01",
        icon: Clock,
        title: "Daily Submission Window",
        summary: "Service open 06:00 - 22:00 with standard 16:00 planning cutoff",
        details:
          "Submit your transport request before 16:00 on the working day. This enables General Affairs (GA) fleet planners to consolidate passenger lists and assign sufficient vans.",
        badge: "Cut-off 16:00",
        badgeVariant: "amber",
      },
      {
        number: "02",
        icon: ShieldCheck,
        title: "Tiger Space OT Synchronization",
        summary: "Submit your overtime request in Tiger Space",
        details:
          "You can submit this transport request immediately without waiting for Tiger Space approval. GA will cross-check and verify approval records with Tiger Space prior to dispatch.",
        badge: "No approval wait required",
        badgeVariant: "blue",
      },
      {
        number: "03",
        icon: MapPin,
        title: "Route & Drop-off Selection",
        summary: "Select your exact shift end time and verified drop-off point",
        details:
          "Check your shift end time (e.g. 19:00, 20:00) and pick the designated route. If your specific stop is missing, choose the closest point and provide exact instructions in the notes field.",
        badge: "Verify Drop-off",
        badgeVariant: "slate",
      },
      {
        number: "04",
        icon: UserCheck,
        title: "Cancellation & Modification Policy",
        summary: "Cancel via Manage Link prior to 16:00 if overtime is cancelled",
        details:
          "If your overtime plan changes or is cancelled, use your Manage Link to cancel the transport booking before 16:00 so van seats can be reallocated to other colleagues.",
        badge: "Notify by 16:00",
        badgeVariant: "red",
      },
      {
        number: "05",
        icon: Bus,
        title: "Boarding & Driver Check-in",
        summary: "Arrive at factory dispatch station 5 minutes prior to departure",
        details:
          "Vans depart strictly on schedule. Please arrive at the factory pickup area 5 minutes early and be ready with your 7-digit Employee ID for driver check-in.",
        badge: "On-time Departure",
        badgeVariant: "green",
      },
    ],
    checklistTitle: "Quick Travel Checklist",
    checklistDesc: "4 easy steps for every OT passenger",
    checklist: [
      "1. Submit OT requisition in Tiger Space",
      "2. Submit transport booking here by 16:00",
      "3. Save your Manage Link / Request Number",
      "4. Arrive at pickup point 5 mins before departure",
    ],
    alertTitle: "Emergency / Late Submissions (After 16:00)",
    alertBody:
      "Requests submitted after 16:00 will be treated as urgent requests subject to vehicle seat availability. Please notify your direct supervisor and contact GA Transport immediately.",
    helpTitle: "Need Further Assistance?",
    helpDesc: "For route inquiries, drop-off adjustments, or fleet issues, contact the General Affairs (GA) team.",
    contactButton: "Contact GA Transport via Outlook",
  },
} as const;

type Language = keyof typeof translations;

export function OtGuidelines() {
  const [language, setLanguage] = useState<Language>("th");
  const text = translations[language];

  return (
    <section className="ot-guidelines overflow-hidden bg-canvas text-ink">
      {/* Header Banner */}
      <header className="relative bg-gradient-to-r from-brand-900 via-brand to-brand-700 px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
              <ShieldCheck size={14} className="text-blue-300" />
              <span>{text.eyebrow}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {text.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-blue-100/90 sm:text-sm">
              {text.subtitle}
            </p>
          </div>

          {/* Language Toggle */}
          <div
            className="flex mr-10 sm:mr-12 rounded-lg border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm"
            aria-label="OT rules language switch"
          >
            {(["th", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  language === option
                    ? "bg-white text-brand shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option === "th" ? "ภาษาไทย" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {text.stats.map((stat, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition hover:bg-white/15"
            >
              <p className="text-[11px] font-medium text-blue-200">{stat.label}</p>
              <p className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-blue-100/75">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column: 5 Core Rules */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-ink sm:text-lg">
              {text.rulesHeading}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {text.rulesSubheading}
            </p>
          </div>

          <div className="space-y-3">
            {text.rules.map((rule) => {
              const IconComponent = rule.icon;
              return (
                <div
                  key={rule.number}
                  className="rounded-xl border border-line bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-brand">
                            RULE {rule.number}
                          </span>
                          <h4 className="text-sm font-bold text-ink">
                            {rule.title}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-700">
                          {rule.summary}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                          {rule.details}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Checklist, Urgent Alert & Contact */}
        <div className="space-y-5">
          {/* Quick Step Checklist */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-ink">
                {text.checklistTitle}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {text.checklistDesc}
            </p>

            <ul className="mt-4 space-y-2.5">
              {text.checklist.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs font-medium text-slate-700"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light text-[10px] font-bold text-brand">
                    {idx + 1}
                  </span>
                  <span className="leading-5">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Urgent / Late Request Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-sm">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  {text.alertTitle}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
                  {text.alertBody}
                </p>
              </div>
            </div>
          </div>

          {/* GA Contact & Support Card */}
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-brand" />
              <h3 className="text-sm font-bold text-ink">
                {text.helpTitle}
              </h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {text.helpDesc}
            </p>
            <a
              href="https://outlook.office.com/mail/deeplink/compose?to=Treebuppha.Saraphan@yageo.com&subject=TOKIN%20OT%20Transport%20Inquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark hover:shadow active:scale-[0.99]"
            >
              <Mail size={14} />
              <span>{text.contactButton}</span>
              <ExternalLink size={12} className="opacity-75" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}