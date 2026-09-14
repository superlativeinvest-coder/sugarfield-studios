import Link from "next/link";

const groups = [
  { title: "Shop", links: [["All Products", "/shop"], ["New Products", "/shop?sort=new"], ["Bundles", "/bundles"]] },
  { title: "Collections", links: [["Pokopia", "/collections/pokopia"], ["TCG", "/collections/tcg"], ["Nintendo Adventures", "/collections/nintendo-adventures"], ["Cozy Games", "/collections/cozy-games"], ["RPG + Completion", "/collections/rpg-completion"], ["Universal Gaming", "/collections/universal-gaming"]] },
  { title: "Account", links: [["My Library", "/library"], ["Order Help", "/order-help"]] },
  { title: "Studio", links: [["About", "/about"], ["Contact", "/contact"], ["FAQ", "/faq"]] },
  { title: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms", "/terms"], ["Digital Product Policy", "/digital-product-policy"]] },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link className="wordmark wordmark--light" href="/">Sugarfield <em>Studio</em></Link>
            <p>Tools for cozy gamers, collectors, builders, and completionists.</p>
          </div>
          <div className="footer-groups">
            {groups.map((group) => (
              <div key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Sugarfield Studio</span>
          <span>Fan-made by Sugarfield Studio. Not affiliated with Nintendo or The Pokemon Company.</span>
        </div>
      </div>
    </footer>
  );
}
