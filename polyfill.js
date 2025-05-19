import { symbol, register, unregister, transfer, serialize, deserialize } from './index.js';

const { BroadcastChannel, MessageChannel, MessagePort, SerializationRegistry, Worker } = globalThis;

if (!SerializationRegistry) {
  const { defineProperty, getOwnPropertyDescriptor } = Object;

  const patchMessages = ({ prototype }) => {
    const { get, set } = getOwnPropertyDescriptor(prototype, 'onmessage');
    const { postMessage } = prototype;
    defineProperty(prototype, 'onmessage', {
      get,
      set(value) {
        return set.call(this, value ?
          (event => value(reviveData(event))) :
          value
        );
      }
    });
    defineProperty(prototype, 'postMessage', {
      value(data, ...args) {
        return postMessage.call(this, serialize(data), ...args);
      }
    });
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
  defineProperty(globalThis, 'SerializationRegistry', {
    configurable: true,
    value: {
      symbol,
      register,
      unregister,
      transfer,
    },
  });
}

export default globalThis.SerializationRegistry;
