"use client";

import { useState } from "react";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";

const workPeriods = [
  { period: "17:20–19:00", day: "—", overtime: "1.67" },
  { period: "17:20–20:00", day: "—", overtime: "2.67" },
  { period: "08:00–16:45", day: "8.00", overtime: "0.00" },
  { period: "08:00–19:00", day: "8.00", overtime: "1.67" },
  { period: "08:00–20:00", day: "8.00", overtime: "2.67" },
];

const translations = {
  th: {
    eyebrow: "นโยบายการทำงานล่วงเวลา",
    title: "แนวทางการคำนวณเวลาทำงาน",
    subtitle: "ข้อมูลอ้างอิงสำหรับตรวจสอบชั่วโมงทำงานและข้อกำหนดก่อนส่งคำขอ",
    weeklyLimit: "ชั่วโมงรวมสูงสุด",
    fiveDayLimit: "OT สูงสุด • 5 วันทำงาน",
    sixDayLimit: "OT สูงสุด • 6 วันทำงาน",
    hoursPerWeek: "ชั่วโมง / สัปดาห์",
    referenceTitle: "ตารางอ้างอิงเวลาทำงาน",
    referenceDescription: "ใช้ตารางนี้เพื่อตรวจสอบชั่วโมงปกติและชั่วโมงล่วงเวลาตามช่วงเวลาทำงาน",
    period: "ช่วงเวลาทำงาน",
    normal: "เวลาปกติ",
    scheduleTitle: "ชั่วโมงรายสัปดาห์ตามวันทำงาน",
    weeklyTarget: "เป้าหมาย 60 ชม.",
    fiveDays: "5 วันทำงาน",
    sixDays: "6 วันทำงาน",
    overtime: "ล่วงเวลา",
    note: "หน่วยเป็นชั่วโมง ตัวเลขใช้สำหรับอ้างอิงการกรอกข้อมูล",
    conditions: "เงื่อนไขการอนุมัติ",
    conditionsDescription: "โปรดตรวจสอบข้อกำหนดต่อไปนี้ก่อนส่งคำขอ",
    ruleOneTitle: "ต้องได้รับอนุมัติก่อนเริ่มงาน",
    ruleOne:
      "พนักงานต้องได้รับคำสั่งหรือการอนุมัติจากบริษัทฯ ก่อนเริ่มทำงานล่วงเวลาหรือทำงานในวันหยุด มิฉะนั้นบริษัทฯ จะไม่จ่ายค่าตอบแทนดังกล่าว",
    ruleTwoTitle: "จ่ายตามชั่วโมงที่อนุมัติ",
    ruleTwo:
      "บริษัทฯ จะจ่ายค่าล่วงเวลาและค่าทำงานในวันหยุดตามจำนวนชั่วโมงที่ได้รับอนุมัติเท่านั้น",
    maximumTitle: "ข้อจำกัดสำคัญ",
    maximumBody: "ชั่วโมงการทำงานรวมต้องไม่เกิน 60.00 ชั่วโมงต่อสัปดาห์",
  },
  en: {
    eyebrow: "Overtime policy",
    title: "Working-hours guidance",
    subtitle: "Reference data for reviewing working hours and policy requirements before submission.",
    weeklyLimit: "Maximum total hours",
    fiveDayLimit: "Maximum OT • 5-day week",
    sixDayLimit: "Maximum OT • 6-day week",
    hoursPerWeek: "hours / week",
    referenceTitle: "Working-hours reference",
    referenceDescription: "Use this table to check normal and overtime hours for common work periods.",
    period: "Work period",
    normal: "Normal time",
    scheduleTitle: "Weekly hours by work schedule",
    weeklyTarget: "60-hour target",
    fiveDays: "5 working days",
    sixDays: "6 working days",
    overtime: "Overtime",
    note: "Values are shown in hours and are provided as a data-entry reference.",
    conditions: "Approval conditions",
    conditionsDescription: "Review these requirements before submitting the request.",
    ruleOneTitle: "Approval is required before work begins",
    ruleOne:
      "Employees must receive a company instruction or approval before starting overtime or holiday work. Otherwise, the company will not pay the related compensation.",
    ruleTwoTitle: "Payment follows approved hours",
    ruleTwo:
      "The company will pay overtime and holiday-work compensation only for the number of hours approved.",
    maximumTitle: "Important limit",
    maximumBody: "Total working hours must not exceed 60.00 hours per week.",
  },
} as const;

type Language = keyof typeof translations;

export function OtGuidelines() {
  const [language, setLanguage] = useState<Language>("en");
  const text = translations[language];

  const limits = [
    { label: text.weeklyLimit, value: "60.00", unit: text.hoursPerWeek },
    { label: text.fiveDayLimit, value: "≤ 20.00", unit: text.hoursPerWeek },
    { label: text.sixDayLimit, value: "≤ 12.00", unit: text.hoursPerWeek },
  ];

  return (
    <section className="ot-guidelines overflow-hidden bg-white text-ink">
      <header className="bg-brand-700 pb-5 pl-5 pr-16 pt-6 text-white sm:pb-6 sm:pl-7 sm:pr-20">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100">
              <ShieldCheck size={15} strokeWidth={2} />
              <span>{text.eyebrow}</span>
            </div>
            <h2 className="text-xl font-semibold leading-tight sm:text-2xl">{text.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/90">{text.subtitle}</p>
          </div>

          <div
            className="flex border border-white/20 bg-brand-800 p-0.5"
            aria-label="OT rules language"
          >
            {(["th", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
                className={`min-w-12 px-3 py-1.5 text-xs font-semibold transition ${
                  language === option
                    ? "bg-white text-brand shadow-sm"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option === "th" ? "TH" : "ENG"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-3">
          {limits.map((item) => (
            <div key={item.label} className="bg-brand-800 px-4 py-3.5">
              <p className="text-[11px] font-medium leading-4 text-blue-100/80">{item.label}</p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                {item.value}
                <span className="ml-1.5 text-[11px] font-medium tracking-normal text-blue-100/75">
                  {item.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid xl:grid-cols-[1.12fr_.88fr]">
        <div className="border-b border-line p-5 sm:p-7 xl:border-b-0 xl:border-r">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-brand-light text-brand">
              <Clock3 size={16} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">{text.referenceTitle}</h3>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">{text.referenceDescription}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="border-b border-line bg-gray-50 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">{text.period}</th>
                  <th className="px-4 py-2.5 text-right">{text.normal}</th>
                  <th className="px-4 py-2.5 text-right">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {workPeriods.map((row) => (
                  <tr key={row.period} className="hover:bg-gray-50/70">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.period}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.day}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand">{row.overtime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-gray-500">{text.note}</p>

          <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
            {text.scheduleTitle}
          </h3>
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="border-b border-line bg-gray-50 text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">{text.weeklyTarget}</th>
                  <th className="px-4 py-2.5 text-right">{text.fiveDays}</th>
                  <th className="px-4 py-2.5 text-right">{text.sixDays}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">{text.normal}</th>
                  <td className="px-4 py-3 text-right text-gray-700">40.00 Hrs.</td>
                  <td className="px-4 py-3 text-right text-gray-700">48.00 Hrs.</td>
                </tr>
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">{text.overtime}</th>
                  <td className="px-4 py-3 text-right font-semibold text-danger">≤ 20.00 Hrs.</td>
                  <td className="px-4 py-3 text-right font-semibold text-danger">≤ 12.00 Hrs.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-gray-50/60 p-5 sm:p-7">
          <div className="border border-line bg-white p-5">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-ink">{text.conditions}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">{text.conditionsDescription}</p>
            </div>

            <ol className="space-y-5">
              {[
                { title: text.ruleOneTitle, body: text.ruleOne },
                { title: text.ruleTwoTitle, body: text.ruleTwo },
              ].map((rule, index) => (
                <li key={rule.title} className="grid grid-cols-[28px_1fr] gap-3">
                  <span className="flex h-7 w-7 items-center justify-center bg-brand-light text-[11px] font-semibold text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{rule.title}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{rule.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 border border-red-200 bg-red-50 px-4 py-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={18} strokeWidth={2} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-danger">
                  {text.maximumTitle}
                </p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-red-900">{text.maximumBody}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}