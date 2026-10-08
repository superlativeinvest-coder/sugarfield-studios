import Image from "next/image";

export const quickStartPreviewPages = [
  { src: "/assets/products/pokopia/quick-start/P01_Quick_Start_Dashboard_US_Letter.png", alt: "Pokopia Quick Start Dashboard printable page", caption: "Quick Start Dashboard — set your session focus." },
  { src: "/assets/products/pokopia/quick-start/P02_Mini_Daily_Reset_US_Letter.png", alt: "Pokopia Mini Daily Reset printable page", caption: "Mini Daily Reset — keep priorities close." },
  { src: "/assets/products/pokopia/quick-start/P03_What_Should_I_Work_On_Next_US_Letter.png", alt: "Pokopia What Should I Work On Next printable page", caption: "What Should I Work On Next — choose a next step." },
  { src: "/assets/products/pokopia/quick-start/P04_Quick_Cloud_Island_Sketch_US_Letter.png", alt: "Pokopia Quick Cloud Island Sketch printable page", caption: "Quick Cloud Island Sketch — capture an island idea." },
  { src: "/assets/products/pokopia/quick-start/P05_Rare_Finds_Notes_US_Letter.png", alt: "Pokopia Rare Finds Notes printable page", caption: "Rare Finds Notes — save discoveries." },
] as const;

export function ProductPreviewFan() {
  return <div className="quick-start-preview-gallery" aria-label="Five real preview pages from the seven-page Pokopia Quick Start Pack">{quickStartPreviewPages.map((page, index) => <figure className={`quick-start-preview-gallery__card${index === 0 ? " quick-start-preview-gallery__card--primary" : ""}`} key={page.src}><Image src={page.src} alt={page.alt} width={2550} height={3300} sizes="(max-width: 640px) 82vw, (max-width: 900px) 42vw, 360px" priority={false} /><figcaption>{page.caption}</figcaption></figure>)}</div>;
}
