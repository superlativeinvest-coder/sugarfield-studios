"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const options = [["Complete everything", "/collections/completion-tools"], ["Track my collection", "/collections/collection-tools"], ["Plan a build", "/collections/building-tools"], ["Organize daily tasks", "/collections/cozy-games"], ["Find information faster", "/shop?type=guide"], ["Track quests or achievements", "/collections/completion-tools"], ["Plan my character/build", "/collections/rpg-completion"], ["Decorate my gaming setup", "/shop?type=poster"]] as const;

export function ProductFinder() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedOption = options.find(([label]) => label === selected);
  return <div className="finder-card"><div className="finder-card__intro"><span className="finder-card__spark" aria-hidden="true">✦</span><div><p className="eyebrow">A simple starting point</p><h3>Start with what you&apos;re trying to accomplish.</h3></div><Image className="finder-card__visual" src="/assets/site/category-images/product-finder.webp" alt="" width={180} height={180} /></div><div className="finder-options" role="group" aria-label="Choose what you want to accomplish">{options.map(([label]) => <button key={label} type="button" className={selected === label ? "finder-option finder-option--selected" : "finder-option"} onClick={() => setSelected(label)}><span aria-hidden="true">{selected === label ? "✓" : "＋"}</span>{label}</button>)}</div>{selectedOption && <Link className="action-link action-link--primary finder-result" href={selectedOption[1]}>Explore tools for this goal <span aria-hidden="true">→</span></Link>}</div>;
}
