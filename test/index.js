import { symbol, register, unregister, transfer, serialize, deserialize } from '../index.js';

let result;

result = deserialize(structuredClone(serialize({})));
result = deserialize(structuredClone(serialize({
  a: 1,
  b: null,
  c: void 0,
  get [symbol]() {
    return Object.keys(this);
  }
})));

result = deserialize(structuredClone(serialize(result)));
console.assert(result.join(',') === 'a,b,c');

result = {
  get [symbol]() {
    return 'any';
  }
};
result = deserialize(structuredClone(serialize([result, result])));
console.assert(result.join(',') === 'any,any');
result = deserialize(structuredClone(serialize([result, result])));

result = deserialize(structuredClone(serialize(new Error('test'))));
console.assert(result instanceof Error);

class Serializable {
  constructor(data) {
    this.data = data;
  }
  get [symbol]() {
    return transfer('Serializable', this.data);
  }
}

register('Serializable', data => new Serializable(data));

try {
  register('Serializable', data => new Serializable(data));
  throw new Error('should not happen');
}
catch (_) {}

result = deserialize(structuredClone(serialize(Object.create(null, {
  [Symbol.toStringTag]: { value: 'Null' },
  test: {
    enumerable: true,
    value: new Serializable(123)
  }
}))));

console.assert(result.test instanceof Serializable);
console.assert(result.test.data === 123);

unregister('Serializable');

result = deserialize(structuredClone(serialize(Object.create(null, {
  [Symbol.toStringTag]: { value: 'Null' },
  test: {
    enumerable: true,
    value: new Serializable(123)
  }
}))));

console.assert(!(result.test instanceof Serializable));
