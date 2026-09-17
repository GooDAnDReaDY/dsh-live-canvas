// dsh-live-canvas: shared tool utilities and defineTool wrapper.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export let Schema;
try {
  const mod = require('@deepseek-ai/schemastery');
  Schema = mod.Schema || mod.default || mod;
} catch (err) {
  /* ignoreOptionalFailure: schemastery fallback stub */
  Schema = {
    object: (shape) => ({ shape, description: () => Schema.object(shape), default: () => Schema.object(shape) }),
    string: () => ({ default: (v) => ({ defaultVal: v, description: () => ({}) }), description: () => ({}) }),
    boolean: () => ({ default: (v) => ({ defaultVal: v, description: () => ({}) }), description: () => ({}) }),
    number: () => ({ default: (v) => ({ defaultVal: v, description: () => ({}) }), description: () => ({}) })
  };
}

let rawDefineTool = (def) => def;
try {
  const dtMod = require('@deepseek-ai/dsh-tools');
  if (dtMod && dtMod.defineTool) {
    rawDefineTool = dtMod.defineTool;
  }
} catch (err) {
  /* ignoreOptionalFailure: dsh-tools optional host wrapper */
}

export function defineTool(def) {
  if (def && typeof def.execute === 'function') {
    const origExecute = def.execute;
    def.execute = async function(args, ...rest) {
      const safeArgs = args && typeof args === 'object' ? args : {};
      return origExecute.call(this, safeArgs, ...rest);
    };
  }
  return rawDefineTool(def);
}
