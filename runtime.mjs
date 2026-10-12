// MIT. Resolve the installed original Stellar Forge runtime without copying it.
import {existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
// FIRECRAWL_RUNTIME_ROOT selects an existing runtime checkout — the directory
// that directly contains sf30-seller-sdk/, sf88-operator-buyer-cli/ and the
// other sf* components. Otherwise the package-local runtime tree is used;
// see runtime/README.md.
export const runtimeRoot = resolve(process.env.FIRECRAWL_RUNTIME_ROOT ??
  fileURLToPath(new URL('./runtime/stellar/scf-starforge-20261009/', import.meta.url)));
export const native = name => {
  const path=join(runtimeRoot,name);
  if(!existsSync(path))throw Object.assign(new Error('FIRECRAWL_RUNTIME_MISSING: '+name),
    {code:'FIRECRAWL_RUNTIME_MISSING'});
  return import(pathToFileURL(path).href);
};
