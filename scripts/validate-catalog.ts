import { bundles, collections, products } from "../lib/catalog/data";
import { validateCatalog } from "../lib/catalog/validation";

const result = validateCatalog(products, collections, bundles);
for (const issue of [...result.errors, ...result.warnings]) console.log(`${issue.level.toUpperCase()}: ${issue.message}`);
console.log(`Catalog validation: ${products.length} products, ${collections.length} collections, ${bundles.length} bundles.`);
if (result.errors.length) process.exitCode = 1;
