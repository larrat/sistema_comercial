export function createModuleRegistry(){
  const defs = new Map();
  const initialized = new Set();

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
    register(def){
      if(!def?.name || typeof def.init !== 'function'){
        throw new Error('Invalid module definition.');
      }
      defs.set(def.name, def);
    },

    async initAll(app){
      for(const name of defs.keys()){
        await initModule(name, app);
      }
    },

    async init(name, app){
      await initModule(name, app);
    },

    list(){
      return Array.from(defs.keys());
    }
  };
}
