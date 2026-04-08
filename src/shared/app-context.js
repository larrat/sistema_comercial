// @ts-check

/** @typedef {import('../types/domain').AppContext} AppContext */

/**
 * @param {{
 *   services?: Record<string, unknown>
 *   config?: Record<string, unknown>
 * }} [options]
 * @returns {AppContext}
 */
export function createAppContext({ services = {}, config = {} } = {}){
  /** @type {Map<string, unknown>} */
  const serviceMap = new Map(Object.entries(services));
  /** @type {Map<string, unknown>} */
  const configMap = new Map(Object.entries(config));
  /** @type {Map<string, () => void>} */
  const cleanups = new Map();

  return {
    /**
     * @template T
     * @param {string} name
     * @param {T} value
     * @returns {T}
     */
    registerService(name, value){
      if(!name) throw new Error('Service name is required.');
      serviceMap.set(name, value);
      return value;
    },

    /**
     * @template T
     * @param {string} name
     * @returns {T}
     */
    getService(name){
      if(!serviceMap.has(name)){
        throw new Error(`Service not registered: ${name}`);
      }
      return /** @type {T} */ (serviceMap.get(name));
    },

    /**
     * @param {string} name
     * @returns {boolean}
     */
    hasService(name){
      return serviceMap.has(name);
    },

    /**
     * @template T
     * @param {string} key
     * @param {T} value
     * @returns {T}
     */
    setConfig(key, value){
      configMap.set(key, value);
      return value;
    },

    /**
     * @template T
     * @param {string} key
     * @param {T} [fallback]
     * @returns {T}
     */
    getConfig(key, fallback = undefined){
      return configMap.has(key) ? /** @type {T} */ (configMap.get(key)) : /** @type {T} */ (fallback);
    },

    /**
     * @param {string} name
     * @param {() => void} cleanup
     */
    registerCleanup(name, cleanup){
      if(!name || typeof cleanup !== 'function') return;
      cleanups.set(name, cleanup);
    },

    /**
     * @param {string | null} [name=null]
     */
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
