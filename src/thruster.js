const util = require('util');

import * as magnitude from "@datagica/magnitude";

function pretty(obj) {
  return util.inspect(obj, false, 20, true)
}

export default class Thruster {

  static generateFakeHistory(nbKeys, len) {
    const history = [];
    for (let i = 0; i < len; i++) {
      cpnst slice = {};
      for (let j = 0; j < nbKeys; j++) {
        slice['item_' + j] = Math.random();
      }
      history.push(slice);
    }
    return history;
  }

  static getSnapshot({
    history: history,
    historyIndex: historyIndex,
    windowSize: windowSize
  }) {

    const slices = history.slice(historyIndex, historyIndex + windowSize);
    const snapshot = {};
    slices.map((r) => {
      Object.keys(r).forEach((k) => {
        if (typeof snapshot[k] === 'undefined') {
          snapshot[k] = [];
        }
        snapshot[k].push(r[k]);
      })
    });
    return snapshot;
  }

  static solveOne({
    history: history,
    historyIndex: historyIndex,
    windowSize: windowSize
  }) {

    const snapshot = Thruster.getSnapshot({
      history: history,
      historyIndex: historyIndex,
      windowSize: windowSize
    });
    console.log("\nsnapshot: " + pretty(snapshot));

    // store all possible tuples here
    var rules = {};
    Object.keys(snapshot).forEach(output => {
      rules[output] = {};
      Object.keys(snapshot).forEach(input => {
        if (output !== input) {
          snapshot[input].reduce((i, item) => {

            // input key format:   channel_id:backlog_id
            var inputKey = `${input}[${i}]`;
            if (typeof rules[output][inputKey] === 'undefined') {
              rules[output][inputKey] = [item];
            } else {
              rules[output][inputKey].push(item);
            }
            return i + 1;
          }, 0);
        }
      });
    });
    console.log("rules: " + pretty(rules));
  }

  static solveAll(history, windowSize) {
    for (var historyIndex = 0; historyIndex < history.length; historyIndex++) {
      Thruster.solveOne({
        history: history,
        historyIndex: historyIndex,
        windowSize: windowSize
      });
    }
  }

  static addToMainRow(mainRow, newRow) {
    Object.keys(newRow).forEach(k => {
      if (typeof mainRow[k] === 'undefined') {
        mainRow[k] = [];
      }
      mainRow[k].push(newRow[k]);
    })
    return mainRow;
  }

  static deltaBetweenRows(row1, row2, fn) {
    const row = {};
    Thruster.addToMainRow(row, row1);
    Thruster.addToMainRow(row, row2);
    return Object.keys(row).reduce((acc, k) => fn(acc, magnitude(row[k][0], row[k][1])), 0);
  }


  static deltaBetweenSpots(col1, col2) {
    if (col1.length !== col2.length)
      throw new Error("deltaBetweenSpots needs spots of same length");
    let delta = 0;
    for (let i = 0; i < col1.length; i++) {
      delta += magnitude(col1[i], col2[i]);
    }
    return delta;
  }

  // TODO this is a parameter exploration task, we could use Lithium for that.
  static sensitivityToHistory(age) {
      return age;

    }
    // search a similar row, going BACK in time
    // history must be older than spot index or it would be useless!
  static findDataCloseToSpot(history, spot) {
    const spotData1 = spot.data;
    const results = [];
    let age = 0;
    for (let i = spot.index + 1;
      (i + spot.length) < history.length; i++) {

      const spotData2 = Thruster.getSpot(history, spot.key, i, spot.length);

      //console.log(pretty({  spotData1: spotData1, spotData2: spotData2  }))
      const delta = Thruster.deltaBetweenSpots(spotData1, spotData2);

      // uncertainty grows quickly, but that's the whole point: waves are short
      // periods of relative order in a stochastic model!
      const uncertainty = delta + Thruster.sensitivityToHistory(age++);

      results.push({
        id: i,
        delta: delta,
        age: age,
        uncertainty: uncertainty,
        prediction: history[i] // current (includes our current spot's top value)
      });
    }

    results.sort((a, b) => a.uncertainty - b.uncertainty);

    // TODO we could optimize: cut off the long tail of results and only keep
    // the big game
    return results;
  }

  static getSpot(history, spotKey, index, depth) {
    return history
      .slice(index, index + depth)
      .map(slice =>
        (typeof slice[spotKey] === 'undefined') ? 0 : slice[spotKey]
      );
  }


  static predict(history) {

    const currentIndex = 0; // TODO fixed for now

    const currentState = history[currentIndex];

    return Object.keys(currentState).reduce((spotsPredictions, spotKey) => {

      // just one spot for our test
      //if (spotKey !== 'item_0') return;

      const spotData = Thruster.getSpot(history, spotKey, currentIndex, 2);
      const spot = {
        key: spotKey,
        index: currentIndex,
        data: spotData,
        length: spotData.length,
        referenceValue: currentState[spotKey]
      };
      const results = Thruster.findDataCloseToSpot(history, spot);

      // TODO maybe not necessary, maybe remove this.
      const globalConfidenceInThisSpot = 0;

      const totalUncertainty = results.reduce((inc, result) => {
        return (inc + result.uncertainty);
      }, 0);


      // the wave's prediction for a single spot
      // a single spot's prediction. this is useful to split the load
      // among workers, evaluate how good a spot is at predicting waves
      // we could also clusterize spots! (and skip useless ones)
      const predictionMadeByThisSpot = results.reduce(((acc, result) => {
        return Object.keys(result.prediction).reduce(((acc, key) => {
          if (typeof acc[key] === 'undefined') {
            acc[key] = 0;
          }
          acc[key] += result.prediction[key] / result.uncertainty;
          return acc;
        }), acc);
      }), {});

      spotsPredictions[spotKey] = {
        spotKey: spotKey,
        spot: spot,
        //results: results,
        prediction: predictionMadeByThisSpot,
        uncertainty: totalUncertainty // TODO use this later, for use in a percentage, to allocate each spot's prediction
      };

      return spotsPredictions;
    }, {});
  }

}
