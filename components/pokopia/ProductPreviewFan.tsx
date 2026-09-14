import Image from "next/image";

export const quickStartPreviewPages = [
  { src: "/assets/products/pokopia/quick-start/P01_Quick_Start_Dashboard_US_Letter.png", alt: "Pokopia Quick Start Dashboard printable page" },
  { src: "/assets/products/pokopia/quick-start/P02_Mini_Daily_Reset_US_Letter.png", alt: "Pokopia Mini Daily Reset printable page" },
  { src: "/assets/products/pokopia/quick-start/P03_What_Should_I_Work_On_Next_US_Letter.png", alt: "Pokopia What Should I Work On Next printable page" },
  { src: "/assets/products/pokopia/quick-start/P04_Quick_Cloud_Island_Sketch_US_Letter.png", alt: "Pokopia Quick Cloud Island Sketch printable page" },
  { src: "/assets/products/pokopia/quick-start/P05_Rare_Finds_Notes_US_Letter.png", alt: "Pokopia Rare Finds Notes printable page" },
] as const;

export function ProductPreviewFan() {
  return <div className="quick-start-preview" aria-label="Five real preview pages from the seven-page Pokopia Quick Start Pack">{quickStartPreviewPages.map((page, index) => <figure className={`quick-start-preview__page quick-start-preview__page--${index + 1}`} key={page.src}><Image src={page.src} alt={page.alt} width={2550} height={3300} sizes="(max-width: 720px) 70vw, 300px" priority={index === 0} /></figure>)}</div>;
}
