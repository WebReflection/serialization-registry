# @ungap/serialization-registry

A proposal to transport structured clone and post message complex references.

**[WHATWG related discussion](https://github.com/whatwg/html/issues/7428#issuecomment-2888486503)**

## API Proposal

```js
// either main thread or workers or iframes
import * as SerializationRegistry from '@ungap/serialization-registry';

// THE PROPOSAL

// similar to Symbol.toStringTag, an accessor that returns
// structured or transfered data to represent the instance
SerializationRegistry.symbol;

// register once a reviver that will receive the data
// returned via `ref[SerializationRegistry.symbol]`
// when deserialization happens
SerializationRegistry.register(
  identifier: string,
  reviver: (structured:object) => object,
);

// unregister a unique identifier previously registered
SerializationRegistry.unregister(identifier: string);

// an explicit transferable representation of the
// registered entity that will pass through the reviver
// once the other side of the algorithm receive the data
SerializationRegistry.transfer(
  identifier: string,
  structured: object,
);
```

#### Implementation Details

These two helpers are needed until the proposal lands.

```js
// currently needed to explicit perform recursive-capable
// search of data that should be serialized differently
SerializationRegistry.serialize(data:any);

// currently needed to explicit perform recursive-capable
// search of data that should be deserialized differently
SerializationRegistry.deserialized(data:any);
```

### Example

```js
import * as SerializationRegistry from '@ungap/serialization-registry';

const uid = 'my-project@Serializable';

// a serializable class
export class Serializable {
  constructor(data) {
    this.data = data;
  }
  get [SerializationRegistry.symbol]() {
    return transfer(uid, this.data);
  }
}

SerializationRegistry.register(uid, data => new Serializable(data));

// postMessage(new Serializable(123))
// will result into a Serializable instance

export class Structured {
  constructor(data) {
    this.data = data;
  }
  get [SerializationRegistry.symbol]() {
    return { just: 'some data', without: 'Class' };
  }
}

// postMessage(new Structured)
// will result into whathever was returned
// via SerializationRegistry.symbol
```

### Polyfill

If you don't want to remember when/how to use `serialize` and `deserialize` you can import the *polyfill* which will automatically expose `SerializationRegistry` globally and it will patch, in the least possible obtrusive way, all communication channels that use `postMessage`, `onmessage` accessor and `addEventListener('message', ...rest)` ability.

```js
import '@ungap/serialization-registry/polyfill';

// all utilities (except serialize/deserialize)
// will be available as global namespace
console.log(SerializationRegistry);
// symbol, register, unregister, transfer
```
