const { isArray } = Array;
const { getPrototypeOf, prototype } = Object;
const { toString } = prototype;

// PROPOSAL
export const symbol = Symbol.for('serialization-registry');

/**
 * Register a reviver for a given uid
 * @param {string} uid
 * @param {(structured:object) => object} reviver
 */
export const register = (uid, reviver) => {
  if (registry.has(uid))
    throw new Error(uid + 'already registered');
  registry.set(uid, reviver);
};

/**
 * Unregister a reviver for a given uid
 * @param {string} uid
 */
export const unregister = uid => {
  registry.delete(uid);
};

/**
 * @typedef {object} Transfer
 * @property {string} uid
 * @property {object} structured
 */

/**
 * Create a transferable reference that will be revived if registered.
 * Current implementation uses a Map to survive Structured Clone.
 * @param {string} uid
 * @param {object} structured
 * @returns {Transfer}
 */
export const transfer = (uid, structured) => new Map([[uid, structured]]);

// POLYFILL's HELPERS

// avoid multiple projects overriding each/other if this module
// gets embedded/bundled multiple times per project
const registry = globalThis[symbol] || (globalThis[symbol] = new Map);

const isObject = (value, type) => type === 'object' && value !== null;

const isLiteral = (ref, name = toString.call(ref).slice(8, -1)) =>
  name in globalThis ?
    name === 'Object' :
    // fallback to 'Object' as last resort
    isLiteral(getPrototypeOf(ref) || prototype)
;


// EXTRAS NEEDED TO POLYFILL THE PROPOSAL

const set = (cache, key, value) => {
  cache.set(key, value);
  return value;
};

const encode = (data, cache) => {
  const type = typeof data;
  if (isObject(data, type) || type === 'function') {
    // speed up with O(1) operation instead of O(2) (has + get)
    // if you transform data as falsy ... please don't in here, thanks!
    let value = cache.get(data);
    if (value) return value;
    value = data[symbol];
    if (value) return set(cache, data, value);
    if (isArray(data)) {
      value = set(cache, data, []);
      for (let i = 0, length = data.length; i < length; i++)
        value[i] = encode(data[i], cache);
      return value;
    }
    if (isLiteral(data)) {
      value = set(cache, data, {});
      for (const key in data)
        value[key] = encode(data[key], cache);
      return value;
    }
  }
  return data;
}

export const serialize = data => encode(data, new Map);

const decode = (data, cache) => {
  if (isObject(data, typeof data)) {
    // speed up with O(1) operation instead of O(2) (has + get)
    // if you revive data as falsy ... please don't in here, thanks!
    let value = cache.get(data);
    if (value) return value;
    switch (data.constructor) {
      case Object:
        for (const key in set(cache, data, data))
          data[key] = decode(data[key], cache);
        break;
      case Array:
        for (let i = 0, l = set(cache, data, data).length; i < l; i++)
          data[i] = decode(data[i], cache);
        break;
      case Map:
        if (data.size === 1) {
          for (const [uid, structured] of data) {
            value = registry.get(uid);
            if (value) return set(cache, data, value(structured));
          }
        }
        // falls through
      default:
        cache.set(data, data);
        break;
    }
  }
  return data;
};

export const deserialize = data => decode(data, new Map);
