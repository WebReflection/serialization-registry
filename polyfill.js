import { symbol, register, unregister, transfer, serialize, deserialize } from './index.js';

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

  const patchMessages = ({ prototype }) => {
    const descriptor = getOwnPropertyDescriptor(prototype, 'onmessage');
    if (descriptor) {
      const { set } = descriptor;
      defineProperty(prototype, 'onmessage', {
        ...descriptor,
        set(value) {
          return set.call(this, value ?
            (event => value(reviveData(event))) :
            value
          );
        }
      });

      const { postMessage } = prototype;
      defineProperty(prototype, 'postMessage', {
        value(data, ...args) {
          return postMessage.call(this, serialize(data), ...args);
        }
      });
    }
  };

  const reviveData = event => {
    if (!revived.has(event)) {
      revived.add(defineProperty(
        event,
        'data',
        { value: deserialize(event.data) }
      ));
    }
    return event;
  };

  const reviveMessage = self => {
    self.addEventListener('message', reviveData);
  };

  const revived = new WeakSet;

  if (MessageChannel && MessagePort) {
    patchMessages(MessagePort);
    globalThis.MessageChannel = class extends MessageChannel {
      constructor(...args) {
        super(...args);
        reviveMessage(this.port1);
        reviveMessage(this.port2);
      }
    };
  }

  if (BroadcastChannel) {
    patchMessages(BroadcastChannel);
    globalThis.BroadcastChannel = class extends BroadcastChannel {
      constructor(...args) {
        super(...args);
        reviveMessage(this);
      }
    };
  }

  if (Worker) {
    patchMessages(Worker);
    globalThis.Worker = class extends Worker {
      constructor(...args) {
        super(...args);
        reviveMessage(this);
      }
    };
  }

  patchMessages({ prototype: globalThis });

  SerializationRegistry = {
    configurable: true,
    value: {
      symbol,
      register,
      unregister,
      transfer,
    },
  };
  defineProperty(globalThis, 'SerializationRegistry', SerializationRegistry);

  defineProperty(globalThis, 'structuredClone', {
    value: (value, options) => deserialize(
      structuredClone(
        serialize(value),
        options
      )
    ),
  });
}

export default SerializationRegistry;
