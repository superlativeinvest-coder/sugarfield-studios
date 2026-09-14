import sharp from "sharp";

const source = "PRODUCTS/POKOPIA/P06_Daily_Reset/assets/imagegen/page-2-full";
const publicPath = "public/assets/products/pokopia/daily-reset";
const desktop = `
<svg width="1122" height="1402" xmlns="http://www.w3.org/2000/svg">
  <style>.copy,.body,.benefit,.proof{font-family:Arial,sans-serif}.copy{fill:#451184}.small{font-size:12px;font-weight:700;letter-spacing:1px}.body{font-size:13px;font-weight:500;fill:#5e5570}.benefit{font-size:12px;font-weight:700;fill:#4b217f}.proof{font-size:13px;font-weight:800;fill:#4c168c}</style>
  <rect x="35" y="15" width="245" height="55" fill="#fffdf9"/><rect x="790" y="15" width="285" height="55" fill="#fffdf9"/>
  <rect x="47" y="106" width="280" height="74" rx="4" fill="#fffdf9"/><text x="52" y="123" class="copy small">POKOPIA DAILY SYSTEM</text><text x="52" y="145" class="copy small">YOUR QUICK START GETS YOU GOING.</text><text x="52" y="163" class="copy small">DAILY RESET KEEPS YOU ON TRACK.</text>
  <rect x="45" y="192" width="425" height="155" fill="#fffdf9"/><text x="52" y="236" class="copy" font-size="51" font-weight="900">POKOPIA</text><text x="52" y="289" class="copy" font-size="51" font-weight="900">DAILY RESET</text><text x="52" y="342" class="copy" font-size="51" font-weight="900">CHECKLIST</text>
  <rect x="47" y="369" width="390" height="69" fill="#fffdf9"/><text x="52" y="389" class="body">Use the Daily Reset Checklist before each session to organize your</text><text x="52" y="408" class="body">priorities, daily checks, reminders, and evening prep in one place.</text>
  <rect x="240" y="473" width="150" height="42" fill="#fffdf9"/><text x="245" y="489" class="copy small" font-size="10">ONE-TIME PURCHASE</text><text x="245" y="505" class="copy small" font-size="10">US LETTER + A4 PDFs</text>
  <rect x="70" y="546" width="370" height="74" fill="#fffdf9"/><text x="74" y="565" class="benefit">✦  Start with your priorities</text><text x="74" y="602" class="benefit">✦  Remember daily Mosslax tasks</text><text x="256" y="565" class="benefit">✦  Check habitat, farming, and cooking</text><text x="256" y="602" class="benefit">✦  Prep for your next session</text>
  <rect x="357" y="838" width="425" height="68" rx="4" fill="#f7f1ff"/><text x="385" y="865" class="proof" font-size="19">EVERY PART OF YOUR DAY, IN ONE PLACE</text><text x="449" y="888" class="body" font-size="11">A simple checklist to help you get more out of your Pokopia adventure.</text>
  <text x="70" y="952" class="proof">MORNING PRIORITIES</text><text x="322" y="952" class="proof">DAILY CHECKS</text><text x="568" y="952" class="proof">MOSSLAX REMINDERS</text><text x="838" y="952" class="proof">EVENING PREP</text>
  <text x="86" y="1197" class="body" font-size="11">Instant digital access</text><text x="341" y="1197" class="body" font-size="11">Print-friendly PDFs</text><text x="584" y="1197" class="body" font-size="11">Secure checkout with Stripe</text><text x="857" y="1197" class="body" font-size="11">2-page daily checklist</text>
  <text x="389" y="1366" class="body" font-size="10">Fan-made by Sugarfield Studio. Not affiliated with Nintendo or The Pokemon Company.</text>
</svg>`;

const mobile = `
<svg width="1024" height="1536" xmlns="http://www.w3.org/2000/svg">
  <style>.copy,.body,.benefit,.proof{font-family:Arial,sans-serif}.copy{fill:#451184}.small{font-size:13px;font-weight:700;letter-spacing:1px}.body{font-size:13px;font-weight:500;fill:#5e5570}.benefit{font-size:12px;font-weight:700;fill:#4b217f}.proof{font-size:13px;font-weight:800;fill:#4c168c}</style>
  <rect x="35" y="12" width="235" height="60" fill="#fffdf9"/><rect x="735" y="12" width="245" height="60" fill="#fffdf9"/>
  <rect x="46" y="106" width="277" height="353" rx="4" fill="#fffdf9"/><text x="52" y="125" class="copy small">POKOPIA DAILY SYSTEM</text><text x="52" y="150" class="copy small">YOUR QUICK START GETS YOU GOING.</text><text x="52" y="170" class="copy small">DAILY RESET KEEPS YOU ON TRACK.</text><text x="52" y="220" class="copy" font-size="40" font-weight="900">POKOPIA</text><text x="52" y="265" class="copy" font-size="40" font-weight="900">DAILY RESET</text><text x="52" y="310" class="copy" font-size="40" font-weight="900">CHECKLIST</text><text x="52" y="345" class="body">Use the Daily Reset Checklist before each session to</text><text x="52" y="364" class="body">organize priorities, checks, reminders, and prep.</text>
  <text x="392" y="791" class="copy small">ONE-TIME PURCHASE</text><text x="392" y="808" class="copy small">US LETTER + A4 PDFs</text><text x="379" y="850" class="benefit">✦  Start with your priorities</text><text x="671" y="850" class="benefit">✦  Check daily tasks</text><text x="379" y="890" class="benefit">✦  Remember reminders</text><text x="671" y="890" class="benefit">✦  Prep next session</text>
  <text x="185" y="1035" class="proof" font-size="18">EVERY PART OF YOUR DAY, IN ONE PLACE</text><text x="305" y="1057" class="body" font-size="11">A simple checklist to help you get more out of your adventure.</text>
  <text x="184" y="1097" class="proof">MORNING PRIORITIES</text><text x="632" y="1097" class="proof">DAILY CHECKS</text><text x="184" y="1243" class="proof">MOSSLAX REMINDERS</text><text x="632" y="1243" class="proof">EVENING PREP</text>
  <text x="115" y="1344" class="body" font-size="10">Instant digital access</text><text x="364" y="1344" class="body" font-size="10">Print-friendly PDFs</text><text x="609" y="1344" class="body" font-size="10">Secure checkout</text><text x="837" y="1344" class="body" font-size="10">2 pages</text>
  <text x="320" y="1515" class="body" font-size="9">Fan-made by Sugarfield Studio. Not affiliated with Nintendo or The Pokemon Company.</text>
</svg>`;

async function publish(input, overlay, finalName) {
  const finalPng = `${source}/${finalName}.png`;
  await sharp(input).composite([{ input: Buffer.from(overlay) }]).png().toFile(finalPng);
  await sharp(finalPng).webp({ quality: 86 }).toFile(`${publicPath}/${finalName}.webp`);
}

await publish(`${source}/p06-daily-reset-page2-full-scene-v2-composited.png`, desktop, "p06-daily-reset-page2-full-scene-v2-final");
await publish(`${source}/p06-daily-reset-page2-full-mobile-v2-composited.png`, mobile, "p06-daily-reset-page2-full-mobile-v2-final");
