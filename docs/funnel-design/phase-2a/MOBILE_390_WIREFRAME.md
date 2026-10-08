# Mobile 390px Wireframe

## Proposed reading sequence

```text
[compact header: brand / Access]
[Free badge]
[headline]
[short lede]
[three fact chips]
[email label + input + full-width CTA + reassurance]
[compact three-page preview]
[problem cards]
[approved preview gallery]
[access steps]
[final CTA]
[compact footer]
```

## 390px specification

- Content width: 358px (`100% - 32px`); header 64px high.
- H1: 48–51px target range; lede 16px; 14–18px gap between primary copy blocks.
- Form input and CTA: 52px high, full width, 8px gap, visible focus ring, explicit email label.
- The form begins before the hero art in source and visual order; the compact three-page art follows it.
- Hero section target: email field and full CTA visible in an 844px usable viewport after consent is chosen.
- No horizontal overflow; all practical tap targets are at least 44px.

## Proposed static-preview measurements

The static artifacts were rendered at 844px height with no horizontal overflow. The complete form control sequence is visible in both proposed layouts:

| Width | Label | Input | CTA | Visible fraction |
| --- | --- | --- | --- | --- |
| 320px | y=475–502 | y=502–558 | y=566–618 | 100% each |
| 390px | y=543–570 | y=570–626 | y=634–686 | 100% each |

These are measurements of the proposed static mockups, not the deployed application.

## 320px stress specification

- Content width: 296px (`100% - 24px`); same one-column form and full-width CTA.
- H1 reduces to 40px; chips may wrap but retain legibility; product art is 250px minimum height.
- Keep header link short (“Access”); no inline form controls.
- Do not hide product proof or make the form dependent on hover/animation.

## Consent annotation

The current undecided consent panel is fixed at y=76–416 on 320px and y=76–372 on 390px in an 844px viewport. It remains unchanged. The proposed mockups depict the normal chosen-consent layout and do not claim to redesign first-visit consent behavior.

## Static evidence

See `previews/quick-start-proposed-390.html/.png` and `previews/quick-start-proposed-320.html/.png`.
