// same as polyfill.js with faster decoding that
// skips logic if no transferred data is present
// ... this is obtrusive and doesn't work if
// data arrives from places where no poly is used

import {
  symbol, register, unregister, transfer,
  serialize, deserialize
} from '../index.js';

let {
  BroadcastChannel,
  MessageChannel,
  MessagePort,
  Worker,
  structuredClone,
  SerializationRegistry,
} = globalThis;

if (!SerializationRegistry) {
  const { defineProperty, getOwnPropertyDescriptor } = Object;

  const patchMessages = prototype => {
    const descriptor = getOwnPropertyDescriptor(prototype, 'onmessage');
    if (descriptor) {
      const { set } = descriptor;
      defineProperty(prototype, 'onmessage', {
        ...descriptor,
        set(value) {
          set.call(this, value ?
            (event => value(reviveData(event))) :
            value
          );
        }
      });

      const { postMessage } = prototype;
      defineProperty(prototype, 'postMessage', {
        value(data, ...args) {
          postMessage.call(this, encode(data), ...args);
        }
      });
    }
  };

  const reviveData = event => {
    if (!revived.has(event))
      revived.add(define(event, 'data', decode(event.data)));
    return event;
  };

  const reviveMessage = self => {
    self.addEventListener('message', reviveData);
  };

  const encode = data => {
    transfered = false;
    return [serialize(data), transfered];
  };

  const decode = ([data, transfered]) => transfered ? deserialize(data) : data;

  const define = (t, p, value) => defineProperty(t, p, { value });

  const revived = new WeakSet;
  let transfered = false;

  patchMessages(globalThis);

  define(
    globalThis,
    'SerializationRegistry',
    (SerializationRegistry = {
      symbol,
      register,
      unregister,
      transfer(uid, structured) {
        transfered = true;
        return transfer(uid, structured);
      }
    })
  );

  define(
    globalThis,
    'structuredClone',
    (value, options) => decode(structuredClone(encode(value), options))
  );

  if (MessageChannel && MessagePort) {
    patchMessages(MessagePort.prototype);
    define(
      globalThis,
      'MessageChannel',
      class extends MessageChannel {
        constructor(...args) {
          super(...args);
          reviveMessage(this.port1);
          reviveMessage(this.port2);
        }
      }
    );
  }

  if (BroadcastChannel) {
    patchMessages(BroadcastChannel.prototype);
    define(
      globalThis,
      'BroadcastChannel',
      class extends BroadcastChannel {
        constructor(...args) {
          reviveMessage(super(...args));
        }
      }
    );
  }

  if (Worker) {
    patchMessages(Worker.prototype);
    define(
      globalThis,
      'Worker',
      class extends Worker {
        constructor(...args) {
          reviveMessage(super(...args));
        }
      }
    );
  }
}

export default SerializationRegistry;
