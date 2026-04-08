export function createAppContext({ services = {}, config = {} } = {}){
  const serviceMap = new Map(Object.entries(services));
  const configMap = new Map(Object.entries(config));
  const cleanups = new Map();

  return {
    registerService(name, value){
      if(!name) throw new Error('Service name is required.');
      serviceMap.set(name, value);
      return value;
    },

    getService(name){
      if(!serviceMap.has(name)){
        throw new Error(`Service not registered: ${name}`);
      }
      return serviceMap.get(name);
    },

    hasService(name){
      return serviceMap.has(name);
    },

    setConfig(key, value){
      configMap.set(key, value);
      return value;
    },

    getConfig(key, fallback = undefined){
      return configMap.has(key) ? configMap.get(key) : fallback;
    },

    registerCleanup(name, cleanup){
      if(!name || typeof cleanup !== 'function') return;
      cleanups.set(name, cleanup);
    },

    dispose(name = null){
      if(name){
        cleanups.get(name)?.();
        cleanups.delete(name);
        return;
      }

      Array.from(cleanups.values()).reverse().forEach(fn => {
        try{
          fn();
        }catch(e){
          console.error('Cleanup failure:', e);
        }
      });
      cleanups.clear();
    }
  };
}
