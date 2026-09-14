# Sugarfield Studio Collection Image System

## Purpose

This image family gives the homepage collection cards a recognizable visual layer without inventing product artwork. Each image is a transparent PNG generated as original, generic category art in a polished clay mini-diorama style.

## Asset map

| Category | File | Use |
| --- | --- | --- |
| Pokopia | `assets/site/category-images/pokopia.webp` | Homepage collection card |
| Pokémon TCG + TCG Pocket | `assets/site/category-images/tcg-collecting.webp` | Homepage collection card |
| Nintendo Adventures | `assets/site/category-images/nintendo-adventures.webp` | Homepage collection card |
| Cozy Games | `assets/site/category-images/cozy-games.webp` | Homepage collection card |
| RPG + Completion | `assets/site/category-images/rpg-completion.webp` | Homepage collection card |
| Universal Gaming | `assets/site/category-images/universal-gaming.webp` | Homepage collection card |
| Product finder | `assets/site/category-images/product-finder.webp` | Homepage finder support visual |

## Rules

- Use the images as decorative accents with empty alt text because the adjacent links provide the category names and descriptions.
- Keep the category card image slot around 108px on desktop and smaller at narrow widths; do not let art displace the link text.
- Preserve transparent backgrounds and use Next Image for responsive optimization.
- These are category illustrations, not evidence of product contents, game sponsorship, or official affiliation.
- Do not reuse them as product previews or as a substitute for approved product files.

## Generation and provenance

The assets were generated with the built-in image generation tool on 2026-08-27. Prompts are preserved in `prompts/site-images/` and intentionally prohibit logos, recognizable characters, screenshots, official symbols, watermarks, text, and product claims. The generated originals remain in the tool output directory; the project copies are the working assets. The project uses 640px WebP derivatives for a much smaller delivery footprint while retaining the transparent background.

## Future updates

New category art should use a transparent square canvas, one centered object cluster, the Sugarfield purple/mint/cream/gold palette, and the same clay material language. Review every image at card size before replacing a working asset.
