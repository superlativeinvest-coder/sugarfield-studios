"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SugarfieldProduct } from "@/lib/catalog/types";
import { trackSugarfieldEvent } from "@/lib/analytics/events";
import { EmailSignup } from "@/components/home/EmailSignup";

type Goal = "build" | "track" | "reference" | "collect";
type Path = "builder" | "tracker" | "reference" | "collector" | "completion";
const goals: { id: Goal; title: string; copy: string; types: string[] }[] = [
  { id: "build", title: "BUILD", copy: "Plan before you place.", types: ["planner"] },
  { id: "track", title: "TRACK", copy: "Keep everything in one place.", types: ["checklist", "tracker"] },
  { id: "reference", title: "REFERENCE", copy: "Stop searching for the same information twice.", types: ["guide"] },
  { id: "collect", title: "COLLECT", copy: "For players who want the whole set.", types: ["cards", "bookmark"] },
];
const questions = [
  ["What are you trying to accomplish?", "Plan a build", "Keep track of daily tasks", "Finish habitats", "Find information faster", "Collect everything", "Complete as much as possible"],
  ["What’s your biggest problem?", "I forget what I’ve already done", "I have too many screenshots", "I don’t know what I’m still missing", "My builds need more planning", "I keep searching for the same information", "I want everything organized together"],
];

function getPath(answers: string[]): Path {
  const text = answers.join(" ").toLowerCase();
  if (text.includes("build") || text.includes("planning")) return "builder";
  if (text.includes("information") || text.includes("searching")) return "reference";
  if (text.includes("collect") || text.includes("everything organized")) return "collector";
  if (text.includes("complete") || text.includes("missing") || text.includes("habitat")) return "completion";
  return "tracker";
}

function track(event: Parameters<typeof trackSugarfieldEvent>[0]["event"], goal?: string) {
  trackSugarfieldEvent({ event, funnel_id: "pokopia", funnel_version: "v1", page_path: "/pokopia", goal });
}

export function PokopiaFunnel({ products }: { products: SugarfieldProduct[] }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [path, setPath] = useState<Path | null>(null);
  const published = useMemo(() => products.filter((product) => product.published), [products]);
  const selected = goals.find((item) => item.id === goal);
  const recommended = selected ? published.filter((product) => selected.types.includes(product.productType)) : published;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryGoal = params.get("goal") as Goal | null;
    const savedGoal = sessionStorage.getItem("sugarfield_pokopia_goal") as Goal | null;
    const initial = goals.some((item) => item.id === queryGoal) ? queryGoal : savedGoal;
    if (initial && goals.some((item) => item.id === initial)) setGoal(initial);
    const savedPath = sessionStorage.getItem("sugarfield_pokopia_assessment") as Path | null;
    if (savedPath && ["builder", "tracker", "reference", "collector", "completion"].includes(savedPath)) setPath(savedPath);
    track("pokopia_funnel_view", initial ?? undefined);
  }, []);

  function chooseGoal(next: Goal) {
    setGoal(next); sessionStorage.setItem("sugarfield_pokopia_goal", next); track("pokopia_goal_selected", next);
  }
  function startAssessment() {
    setStep(0); setAnswers([]); setPath(null); track("pokopia_assessment_started", goal ?? undefined);
    document.getElementById("pokopia-assessment")?.scrollIntoView({ behavior: "smooth" });
  }
  function answer(value: string) {
    const next = [...answers, value]; setAnswers(next);
    if (step < questions.length - 1) setStep(step + 1);
    else { const result = getPath(next); setPath(result); sessionStorage.setItem("sugarfield_pokopia_assessment", result); track("pokopia_assessment_completed", result); }
  }

  return <main>
    <section className="pokopia-hero"><div className="site-container pokopia-hero__grid"><div><p className="eyebrow">The Pokopia companion funnel</p><h1>Your Pokopia adventure, organized.</h1><p className="pokopia-hero__lede">Build. Track. Collect. Discover.</p><p className="pokopia-hero__copy">Sugarfield Studio creates fan-made planners, trackers, reference guides and collection tools designed to help you spend less time trying to remember everything — and more time actually playing.</p><div className="hero-actions"><button className="action-link action-link--primary" type="button" onClick={() => document.getElementById("pokopia-goals")?.scrollIntoView({ behavior: "smooth" })}>Find my Pokopia tools</button><button className="action-link action-link--secondary" type="button" onClick={startAssessment}>Start with a free tracker</button></div><p className="pokopia-disclaimer">Fan-made by Sugarfield Studio. Not affiliated with Nintendo or The Pokemon Company.</p></div><div className="pokopia-hero__art"><div className="pokopia-hero__orb" aria-hidden="true" /><Image src="/assets/site/category-images/pokopia.webp" alt="" width={560} height={560} priority /><span className="pokopia-hero__sticker">Plan · Track · Play</span></div></div></section>

    <section id="pokopia-goals" className="pokopia-goals site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">Start with your goal</p><h2>What are you working on right now?</h2></div><div className="pokopia-goal-grid">{goals.map((item, index) => <button key={item.id} type="button" className={`pokopia-goal-card pokopia-goal-card--${item.id} ${goal === item.id ? "is-selected" : ""}`} onClick={() => chooseGoal(item.id)} aria-pressed={goal === item.id}><span className="card-number">0{index + 1}</span><span className="pokopia-goal-card__visual" aria-hidden="true"><span className="pokopia-goal-card__icon">{["✦", "✓", "?", "◆"][index]}</span><i /><i /><i /></span><strong>{item.title}</strong><span>{item.copy}</span><small>{item.id === "build" ? "Layouts, paths, resources, furniture and Cloud Island builds." : item.id === "track" ? "Habitats, daily tasks, rare finds and progress." : item.id === "reference" ? "Recipes, ingredients, paint, habitats and useful answers." : "Cards, bookmarks, collections and complete companion tools."}</small><em>Show me {item.id} tools →</em></button>)}</div>{selected && <div className="pokopia-goal-result" role="status"><strong>{selected.title.toLowerCase()} tools are highlighted below.</strong><a href="#pokopia-systems">Jump to recommendations →</a></div>}</div></section>

    <section className="pokopia-problems site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">A familiar kind of chaos</p><h2>Pokopia gets complicated fast.</h2></div><div className="pokopia-problem-grid">{[["Too many screenshots", "You saved it somewhere. Good luck finding it."], ["Forgot what you already did", "Was that finished, or were you coming back later?"], ["Build first. Regret later.", "Moving everything again wasn’t part of the plan."], ["Information everywhere", "Wiki. Notes. Screenshots. Browser tabs. Repeat."], ["Completion brain activated", "You know there’s something you missed."]].map(([title, copy], index) => <article className={`pokopia-problem-card pokopia-problem-card--${index + 1}`} key={title}><span className="pokopia-problem-card__number">0{index + 1}</span><span aria-hidden="true">✦</span><h3>{title}</h3><p>{copy}</p></article>)}</div><p className="pokopia-transition">There’s an easier way to keep track of it.</p></div></section>

    <section className="pokopia-before-after site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">Make the useful stuff usable</p><h2>From chaos to a system.</h2></div><div className="pokopia-compare"><div className="pokopia-compare__before"><span>Before Sugarfield</span><div className="pokopia-chaos-art" aria-hidden="true"><i /><i /><i /><i /><i /></div><ul><li>▧ Screenshots</li><li>✎ Scattered notes</li><li>▤ Browser tabs</li><li>⏱ Random reminders</li><li>⌁ Rough build sketches</li></ul></div><div className="pokopia-compare__after"><span>With Sugarfield</span><div className="pokopia-system-art" aria-hidden="true"><i>✓</i><i>◆</i><i>☷</i><i>✦</i><i>◈</i></div><ul><li>✓ Tracker</li><li>◆ Planner</li><li>☷ Checklist</li><li>✦ Guide</li><li>◈ Collection system</li></ul></div></div><p className="pokopia-compare-copy">Sugarfield turns the information you’re already trying to remember into simple tools you can actually use while you play.</p></div></section>

    <section id="pokopia-starter" className="pokopia-starter site-section"><div className="site-container"><div className="pokopia-starter__inner"><div><p className="eyebrow">A free place to begin</p><h2>The free Pokopia starter kit.</h2><p>Not sure where to start? Start free. Get a simple Pokopia starter tracker plus personalized recommendations based on what you’re working on.</p><div className="pokopia-three-steps">{[["01", "Tell us how you play"], ["02", "Get your free tracker"], ["03", "See the tools that fit you"]].map(([number, title]) => <div key={number}><span>{number}</span><strong>{title}</strong></div>)}</div><button className="action-link action-link--primary" type="button" onClick={startAssessment}>Get my free starter kit</button></div><div className="pokopia-starter__visual"><span className="pokopia-free-badge">FREE STARTER KIT</span><div className="pokopia-mockup" aria-label="Starter tracker preview slot"><span>Pokopia starter tracker</span><i /><i /><i /><i /></div><div className="pokopia-starter__note"><span aria-hidden="true">✦</span><strong>Product-fit recommendations, not a personality quiz.</strong><p>Answer two quick questions and you can still browse every available Pokopia tool without submitting an email.</p></div></div></div></div></section>

    <section id="pokopia-assessment" className="pokopia-assessment site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">Find your starting point</p><h2>Build your Pokopia toolkit.</h2></div>{!path ? <div className="assessment-card"><div className="assessment-progress"><span>Question {step + 1} of {questions.length}</span><i style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div><h3>{questions[step][0]}</h3><div className="assessment-options">{questions[step].slice(1).map((option) => <button key={option} type="button" onClick={() => answer(option)}>{option}<span aria-hidden="true">→</span></button>)}</div></div> : <div className="assessment-result" role="status"><p className="eyebrow">Your recommended path</p><h3>{path}</h3><p>We’ve highlighted the closest available Pokopia tools below. Browse freely, or get the free starter kit by email when the email provider is connected.</p><a className="action-link action-link--primary" href="#pokopia-systems">See my recommendations</a></div>}</div></section>

    <section id="pokopia-systems" className="pokopia-systems site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">Personalized paths</p><h2>Build your Pokopia system.</h2><p className="section-intro">Choose the system that matches the way you’re playing today. Only configured products appear here.</p></div><div className="pokopia-system-grid">{goals.map((item) => { const items = published.filter((product) => item.types.includes(product.productType)); return <article className={`pokopia-system ${goal === item.id ? "is-highlighted" : ""}`} key={item.id}><div><p className="eyebrow">{item.title} system</p><h3>{item.id === "build" ? "For planning before you start moving things around." : item.id === "track" ? "For keeping progress visible." : item.id === "reference" ? "For getting answers without hunting through tabs." : "For players who enjoy complete sets and companion tools."}</h3></div>{items.length ? <ul>{items.map((product) => <li key={product.id}><strong>{product.name}</strong><span>{product.shortBenefit ?? product.description}</span><Link href={`/products/${product.slug}`}>View tool →</Link></li>)}</ul> : <p className="empty-state">No configured {item.title.toLowerCase()} products yet. New tools will appear here when approved catalog records are ready.</p>}<a href="#pokopia-products" className="action-link action-link--secondary">Explore {item.title.toLowerCase()} tools</a></article>; })}</div></div></section>

    <section className="pokopia-bundle site-section"><div className="site-container"><div className="pokopia-bundle__inner"><div><p className="eyebrow">Anchor offer</p><h2>The complete Pokopia companion.</h2><p>Everything you need to build, track, reference and organize your Pokopia adventure.</p></div><div className="pokopia-bundle__status"><div className="pokopia-bundle__halo" aria-hidden="true"><span>✦</span><span>◆</span><span>✓</span></div><strong>Bundle configuration in progress</strong><p>Contents, pricing, discount, and Stripe mapping will appear only after they are approved in the catalog.</p><button className="action-link" type="button" disabled>Get the complete companion</button></div></div></div></section>

    <section id="pokopia-products" className="pokopia-products site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">Curated for the job</p><h2>Pick only what you need.</h2></div><div className="pokopia-product-grid">{recommended.map((product) => <article className={`pokopia-product-card pokopia-product-card--${product.productType}`} key={product.id}><div className="pokopia-product-card__media"><span className="pokopia-product-card__media-label">{product.productType === "planner" ? "PLANNING TOOL" : product.productType === "guide" ? "REFERENCE TOOL" : "TRACKING TOOL"}</span><span>Approved product artwork coming soon</span><i /><i /><i /></div><p className="catalog-card__meta">{product.productType}</p><h3>{product.name}</h3><p>{product.shortBenefit ?? product.description}</p><div><span>{product.price !== undefined && product.currency ? new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency }).format(product.price) : "Price coming soon"}</span><Link href={`/products/${product.slug}`} onClick={() => track("pokopia_product_viewed", product.id)}>View tool →</Link></div></article>)}</div></div></section>

    <section className="pokopia-how site-section"><div className="site-container"><div className="section-heading"><p className="eyebrow">Simple by design</p><h2>From download to game night.</h2></div><div className="pokopia-four-steps">{[["01", "Choose your tool", "Pick the planner, tracker, guide or bundle that solves what you’re working on."], ["02", "Download", "Receive the digital files associated with your order when delivery is configured."], ["03", "Print or use digitally", "Use only the formats supported by the product record."], ["04", "Get back to playing", "Less searching. Less remembering. More playing."]].map(([number, title, copy]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></div></section>

    <section className="pokopia-lifestyle site-section"><div className="site-container"><div><p className="eyebrow">You know who you are</p><h2>For players who turn relaxing games into serious projects.</h2><p>You make lists. You save screenshots. You plan builds. You need to know what you’re missing. And somehow the “cozy game” now has a spreadsheet.</p><strong>Sugarfield Studio makes tools for that kind of player.</strong></div><Image src="/assets/site/category-images/pokopia.webp" alt="" width={380} height={380} /></div></section>
    <section className="pokopia-lead site-section"><div className="site-container"><p className="eyebrow">Seen one of our tips?</p><h2>Don’t lose it in your saved videos.</h2><p>Get free Pokopia tools, new tracker drops and useful resources sent to you.</p><EmailSignup id="pokopia-email" buttonLabel="Send me the good stuff" note="Email signup will report clearly when the provider is connected." onSubmitResult={(subscribed) => { if (subscribed) track("pokopia_lead_submitted"); }} /></div></section>
    <section className="pokopia-final"><div className="site-container"><p className="eyebrow">Your next session starts here</p><h2>Stop trying to keep the whole game in your head.</h2><p>Find the Pokopia tools built for the way you play.</p><div className="hero-actions"><button className="action-link action-link--primary" type="button" onClick={startAssessment}>Build my Pokopia toolkit</button><a className="action-link action-link--secondary" href="#pokopia-products">Browse all Pokopia tools</a></div></div></section>
  </main>;
}
