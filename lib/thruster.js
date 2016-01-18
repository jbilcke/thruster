'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Utils = require('./utils');

var Marketwave = (function () {
  function Marketwave() {
    _classCallCheck(this, Marketwave);
  }

  _createClass(Marketwave, null, [{
    key: 'generateFakeHistory',

    /*
    Compute the relative distance between two numbers
     > NumericDistance(0,0) = 0
    > NumericDistance(0,1) = 0.5
    > NumericDistance(0,10) = 0.9090909090909091
    > NumericDistance(0,100000000) = 0.9999999900000001
    > NumericDistance(1,1) = 0
    > NumericDistance(1,2) = 0.5
    > NumericDistance(1,3) = 0.6666666666666667
    > NumericDistance(1,4) = 0.75
    > NumericDistance(1,5) = 0.8
    > NumericDistance(1,1.0001) = 0.00004999999999999449
    > NumericDistance(1,1) = 0
    > NumericDistance(20,30) = 0.9090909090909091
    */

    value: function generateFakeHistory(nbKeys, len) {
      var history = [];
      for (var i = 0; i < len; i++) {
        var slice = {};
        for (var j = 0; j < nbKeys; j++) {
          slice['item_' + j] = Math.random();
        }
        history.push(slice);
      }
      return history;
    }
  }, {
    key: 'getSnapshot',
    value: function getSnapshot(_ref) {
      var history = _ref.history;
      var historyIndex = _ref.historyIndex;
      var windowSize = _ref.windowSize;

      var slices = history.slice(historyIndex, historyIndex + windowSize);
      var snapshot = {};
      slices.map(function (r) {
        Object.keys(r).forEach(function (k) {
          if (typeof snapshot[k] === 'undefined') {
            snapshot[k] = [];
          }
          snapshot[k].push(r[k]);
        });
      });
      return snapshot;
    }
  }, {
    key: 'solveOne',
    value: function solveOne(_ref2) {
      var history = _ref2.history;
      var historyIndex = _ref2.historyIndex;
      var windowSize = _ref2.windowSize;

      var snapshot = Marketwave.getSnapshot({
        history: history,
        historyIndex: historyIndex,
        windowSize: windowSize
      });
      console.log('\nsnapshot: ' + Utils.pretty(snapshot));

      // store all possible tuples here
      var rules = {};
      Object.keys(snapshot).forEach(function (output) {
        rules[output] = {};
        Object.keys(snapshot).forEach(function (input) {
          if (output !== input) {
            snapshot[input].reduce(function (i, item) {

              // input key format:   channel_id:backlog_id
              var inputKey = input + '[' + i + ']';
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
      console.log('rules: ' + Utils.pretty(rules));
    }
  }, {
    key: 'solveAll',
    value: function solveAll(history, windowSize) {
      for (var historyIndex = 0; historyIndex < history.length; historyIndex++) {
        Marketwave.solveOne({
          history: history,
          historyIndex: historyIndex,
          windowSize: windowSize
        });
      }
    }
  }, {
    key: 'addToMainRow',
    value: function addToMainRow(mainRow, newRow) {
      Object.keys(newRow).forEach(function (k) {
        if (typeof mainRow[k] === 'undefined') {
          mainRow[k] = [];
        }
        mainRow[k].push(newRow[k]);
      });
      return mainRow;
    }
  }, {
    key: 'deltaBetweenRows',
    value: function deltaBetweenRows(row1, row2, fn) {
      var row = {};
      Marketwave.addToMainRow(row, row1);
      Marketwave.addToMainRow(row, row2);
      return Object.keys(row).reduce(function (acc, k) {
        return fn(acc, Utils.numericDistance(row[k][0], row[k][1]));
      }, 0);
    }
  }, {
    key: 'deltaBetweenColumns',
    value: function deltaBetweenColumns(col1, col2) {
      if (col1.length !== col2.length) throw new Error('deltaBetweenColumns needs columns of same length');
      var delta = 0;
      for (var i = 0; i < col1.length; i++) {
        delta += Utils.numericDistance(col1[i], col2[i]);
      }
      return delta;
    }
  }, {
    key: 'sensitivityToHistory',
    value: function sensitivityToHistory(age) {
      // TODO implement here seither a constant or an algorithm that compute the
      // sensitivityToHistory
      // note that ideally we should start with an exploration algorithm,
      // genetic or whatever works the best to find the value
      return age;
    }
  }, {
    key: 'findDataCloseToColumn',

    // search similar row row, going BACK in time
    // history must be older than column index or it would be useless!
    value: function findDataCloseToColumn(history, column) {
      var columnData1 = column.data;
      var results = [];
      var age = 0;
      for (var i = column.index + 1; i + column.length < history.length; i++) {

        var columnData2 = Marketwave.getColumn(history, column.key, i, column.length);

        //console.log(Utils.pretty({  columnData1: columnData1, columnData2: columnData2  }))
        var delta = Marketwave.deltaBetweenColumns(columnData1, columnData2);

        // uncertainty grows quickly, but that's the whole point: you cannot
        // really predict stock market prices
        var uncertainty = delta + Marketwave.sensitivityToHistory(age++);

        results.push({
          id: i,
          delta: delta,
          age: age,
          uncertainty: uncertainty,
          prediction: history[i] // current (includes our current column's top value)
        });
      }

      results.sort(function (a, b) {
        return a.uncertainty - b.uncertainty;
      });

      // TODO implement here an optimization if necessary, that will cut off
      // the results and only keep the best items
      // it is not really a part of the algorithm, and if implemented it
      // will work as an approximation  sub-optimal variant, but it is probably
      // necessary to achieve quick results for large datasets

      return results;
    }
  }, {
    key: 'getColumn',
    value: function getColumn(history, columnKey, index, depth) {
      return history.slice(index, index + depth).map(function (slice) {
        return typeof slice[columnKey] === 'undefined' ? 0 : slice[columnKey];
      });
    }
  }, {
    key: 'predict',
    value: function predict(history) {

      var currentIndex = 0; // fixed for now

      var currentState = history[currentIndex];

      return Object.keys(currentState).reduce(function (columnsPredictions, columnKey) {

        // just one column for our test
        //if (columnKey !== 'item_0') return;

        var columnData = Marketwave.getColumn(history, columnKey, currentIndex, 2);
        var column = {
          key: columnKey,
          index: currentIndex,
          data: columnData,
          length: columnData.length,
          referenceValue: currentState[columnKey]
        };
        var results = Marketwave.findDataCloseToColumn(history, column);

        // maybe not necessary, but we might be interested in the same thing for
        // individual one-to-one relationships
        var globalConfidenceInThisColumn = 0;

        var totaluncertainty = results.reduce(function (inc, result) {
          return inc + result.uncertainty;
        }, 0);

        // what a single column gives us for prediction
        // to compute the final prediction, we would need to aggregate the
        // prediction of many columns
        // but using each column one by one let us:
        // - not process all columns, or skip some if necessary
        // - distribute / split the work using clusters
        // - evaluate individual columns using a score, either globally or relative to their neighbhors (ie. compute a "good predicator" edge weight)
        // - clusterize columns by their relative influence score

        var predictionByThisColumn = results.reduce(function (acc, result) {
          return Object.keys(result.prediction).reduce(function (acc, key) {
            if (typeof acc[key] === 'undefined') {
              acc[key] = 0;
            }
            acc[key] += result.prediction[key] / result.uncertainty;
            return acc;
          }, acc);
        }, {});
        /*
          const columnPrediction = {
            columnKey: columnKey,
            column: column,
            //results: results,
            prediction: predictionByThisColumn,
            uncertainty: totaluncertainty // TODO use this later, for use in a percentage, to allocate each column's prediction
          };
           console.log(Utils.pretty(columnPrediction));
        */
        columnsPredictions[columnKey] = {
          columnKey: columnKey,
          column: column,
          //results: results,
          prediction: predictionByThisColumn,
          uncertainty: totaluncertainty // TODO use this later, for use in a percentage, to allocate each column's prediction
        };

        return columnsPredictions;
      }, {});
    }
  }]);

  return Marketwave;
})();

exports['default'] = Marketwave;
module.exports = exports['default'];