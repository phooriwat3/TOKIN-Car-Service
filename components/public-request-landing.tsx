import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CarFront,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MailCheck,
  MapPin,
  MessageSquare,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const services = [
  {
    href: "/request/overtime",
    eyebrow: "Daily employee service",
    title: "Overtime transport",
    description: "Request company transport after approved overtime or holiday work.",
    note: "Submit by 16:00",
    icon: BusFront,
    accent: "bg-amber-400 text-slate-950",
  },
  {
    href: "/request/car-service",
    eyebrow: "Official business travel",
    title: "Off-site business trip",
    description: "Request a company vehicle and driver for approved external business travel.",
    note: "Manager approval",
    icon: CarFront,
    accent: "bg-brand-500 text-white",
  },
  {
    href: "/request/track",
    eyebrow: "Existing request",
    title: "Track request",
    description: "Open your secure link to see status, next actions, and editable details.",
    note: "Secure link required",
    icon: Search,
    accent: "bg-slate-800 text-white",
  },
];

const advantages = [
  {
    icon: ShieldCheck,
    title: "No application sign-in",
    body: "Submit with your company identity and confirm through the secure message you receive.",
  },
  {
    icon: Users,
    title: "Automatic routing",
    body: "Department and request type send the request to the correct approval or verification queue.",
  },
  {
    icon: CarFront,
    title: "GA transport planning",
    body: "GA reviews approved demand and assigns the appropriate vehicle and driver.",
  },
  {
    icon: MailCheck,
    title: "Clear status updates",
    body: "Company email and Teams messages provide confirmation, decisions, and assignment details.",
  },
];

const guidance = [
  {
    icon: Clock3,
    title: "OT booking window",
    body: "Submit normal OT transport demand by 16:00 Thailand time. Late requests depend on availability.",
    href: "/request/overtime",
    action: "Open OT request",
  },
  {
    icon: ShieldCheck,
    title: "Secure request access",
    body: "Keep the newest management link private. A request number alone cannot expose employee or trip data.",
    href: "/request/track",
    action: "Track securely",
  },
  {
    icon: HelpCircle,
    title: "Need help?",
    body: "Review the employee guide for approval, confirmation, changes, cancellation, and assignment steps.",
    href: "/request/help",
    action: "Read user guide",
  },
];

export function PublicRequestLanding() {
  return (
    <div className="bg-slate-50">
      <section className="relative isolate min-h-[520px] overflow-hidden bg-brand-950 sm:min-h-[590px]">
        <Image
          src="/images/tokin-thailand.jpg"
          alt="TOKIN Electronics Thailand facility"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,13,26,0.97)_0%,rgba(7,22,40,0.9)_42%,rgba(10,34,64,0.48)_78%,rgba(10,34,64,0.28)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,13,26,0.68)_0%,transparent_48%)]" />
        <div className="relative mx-auto flex min-h-[520px] max-w-[1080px] items-center px-4 pb-28 pt-12 sm:min-h-[590px] sm:px-6 sm:pb-32">
          <div className="max-w-2xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-100 backdrop-blur-sm">
              <Sparkles size={14} aria-hidden="true" /> Employee transport service
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
              Reliable transport for every workday.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
              Request overtime transport or an off-site business vehicle in a few clear steps. TOKIN routes the request, keeps you updated, and lets GA plan the right trip.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-white/90">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-amber-300" /> No Microsoft login</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-amber-300" /> Mobile friendly</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-amber-300" /> Secure status links</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-24 px-4 sm:-mt-28 sm:px-6" aria-labelledby="service-selection-title">
        <div className="mx-auto max-w-[1080px] overflow-hidden rounded-2xl border border-white/20 bg-brand-900 shadow-[0_24px_70px_rgba(4,13,26,0.28)]">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-200">Start here</p>
              <h2 id="service-selection-title" className="mt-0.5 text-xl font-bold">Choose your transport service</h2>
            </div>
            <p className="text-xs text-brand-200">Company email required · No application login</p>
          </div>
          <div className="grid bg-brand-800 md:grid-cols-3">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.href}
                  href={service.href}
                  className={`group relative flex min-h-60 flex-col p-5 text-white transition hover:bg-white/[0.07] sm:p-6 ${index ? "border-t border-white/10 md:border-l md:border-t-0" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl ${service.accent}`}>
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-100">
                      {service.note}
                    </span>
                  </div>
                  <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-200">{service.eyebrow}</p>
                  <h3 className="mt-1 text-xl font-bold">{service.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-brand-100">{service.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-300">
                    Start now <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="advantages-title">
        <div className="mx-auto max-w-[1080px]">
          <SectionTitle eyebrow="Designed for daily operations" title="Simple for employees. Clear for GA." id="advantages-title" />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {advantages.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="text-center sm:text-left lg:text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-brand-600 text-white shadow-md sm:mx-0 lg:mx-auto">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="workflow-title">
        <div className="mx-auto max-w-[1080px]">
          <SectionTitle eyebrow="How it works" title="From request to completed trip" id="workflow-title" />
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              ["01", "Submit", "Choose the service and complete only the details needed for that trip."],
              ["02", "Confirm", "Use the secure company message to confirm that the request is yours."],
              ["03", "Approve & assign", "The correct reviewer acts, then GA assigns the vehicle and driver."],
              ["04", "Travel", "Receive the final plan, meet at the confirmed point, and complete the trip."],
            ].map(([number, title, body]) => (
              <li key={number} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-4xl font-extrabold text-brand-100">{number}</span>
                <h3 className="mt-2 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="guidance-title">
        <div className="mx-auto max-w-[1080px]">
          <SectionTitle eyebrow="Before you travel" title="Useful information" id="guidance-title" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {guidance.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-card">
                  <Icon size={24} className="text-brand-600" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.body}</p>
                  <Link href={item.href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                    {item.action} <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-brand-800 px-4 py-10 text-white sm:px-6">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_32%),radial-gradient(circle_at_80%_80%,white_0,transparent_28%)]" />
        <div className="relative mx-auto flex max-w-[1080px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-400 text-brand-950">
              <MapPin size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-200">Operational support</p>
              <h2 className="mt-1 text-2xl font-bold">Urgent change or transport question?</h2>
              <p className="mt-1 text-sm text-brand-100">Contact GA and include your request number. Never send your secure management link.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href="https://teams.microsoft.com/l/chat/0/0?users=Treebuppha.Saraphan@yageo.com" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white px-4 text-sm font-bold text-brand-800 hover:bg-brand-50">
              <MessageSquare size={16} aria-hidden="true" /> GA Teams
            </a>
            <a href="tel:2513" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-bold text-brand-950 hover:bg-amber-300">
              <PhoneCall size={16} aria-hidden="true" /> Call 2513
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-3xl">{title}</h2>
      <span className="mx-auto mt-4 block h-1 w-12 rounded-full bg-amber-400" />
    </div>
  );
}
