import '../polyfill.js';

const { register, symbol, transfer } = SerializationRegistry;

const uid = '💡Serializable';

export class Serializable {
  constructor(data) {
    this.data = data;
  }
  get [symbol]() {
    return transfer(uid, this.data);
  }
}

register(uid, data => new Serializable(data));

export class Structured {
  constructor(data) {
    this.data = data;
  }
  get [symbol]() {
    return { just: this.data };
  }
}
