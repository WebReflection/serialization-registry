import '../polyfill.js';
import { Serializable, Structured } from './serializable.js';

onmessage = ({ data }) => {
  console.log(data);
};
