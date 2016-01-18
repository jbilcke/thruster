const util = require('util');

function pretty(obj) {
  return util.inspect(obj, false, 20, true)
}

import Thruster from '../lib/thruster';

// generates a fake history, for debugging
const history = Thruster.generateFakeHistory(4, 50);

// predict the waves
console.log(pretty(Thruster.predict(history)));
