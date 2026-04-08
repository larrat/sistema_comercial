// @ts-check

/** @typedef {import('../types/domain').AppContext} AppContext */
/** @typedef {import('../types/domain').ModuleDefinition} ModuleDefinition */
/** @typedef {import('../types/domain').ModuleRegistry} ModuleRegistry */

/**
 * @returns {ModuleRegistry}
 */
export function createModuleRegistry(){
  /** @type {Map<string, ModuleDefinition>} */
  const defs = new Map();
  /** @type {Set<string>} */
  const initialized = new Set();

  /**
   * @param {string} name
   * @param {AppContext} app
   */
  async function initModule(name, app){
    if(initialized.has(name)) return;
    const def = defs.get(name);
    if(!def) throw new Error(`Module not registered: ${name}`);

    if(Array.isArray(def.dependsOn) && def.dependsOn.length){
      for(const dep of def.dependsOn){
        await initModule(dep, app);
      }
    }

    const cleanup = await def.init(app);
    if(typeof cleanup === 'function'){
      app.registerCleanup(name, cleanup);
    }
    initialized.add(name);
  }

  return {
    /**
     * @param {ModuleDefinition} def
     */
    register(def){
      if(!def?.name || typeof def.init !== 'function'){
        throw new Error('Invalid module definition.');
      }
      defs.set(def.name, def);
    },

    /**
     * @param {AppContext} app
     */
    async initAll(app){
      for(const name of defs.keys()){
        await initModule(name, app);
      }
    },

    /**
     * @param {string} name
     * @param {AppContext} app
     */
    async init(name, app){
      await initModule(name, app);
    },

    /**
     * @returns {string[]}
     */
    list(){
      return Array.from(defs.keys());
    }
  };
}
