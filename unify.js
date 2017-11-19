'use strict';

const { Empty, symbols } = require('./common.js');

const firingSym = symbols.firing;
const watchersSym = symbols.watchers;

function unify (inst1, inst2) {
    let map1 = inst1[watchersSym];
    let map2 = inst2[watchersSym];
    let replacement, to;

    if (map1) {
        if (map2 && map1 !== map2) {
            for (let event of Object.keys(map2)) {
                let from = map2[event];

                if (from) {
                    if (!(to = map1[event])) {
                        map1[event] = from;

                        if (inst1.onEventWatch) {
                            inst1.onEventWatch(event);
                        }
                    }
                    else {
                        let multiFrom = firingSym in from;

                        map1[event] = replacement = (firingSym in to) ?
                            (multiFrom ? [...to, ...from] : [...to, from]) :
                            (multiFrom ? [to, ...from] : [to, from]);

                        replacement[firingSym] = 0;
                    }
                }
            }
        }

        inst2[watchersSym] = map1;
    }
    else {
        inst1[watchersSym] = map2 || (inst2[watchersSym] = new Empty());

        if (map2 && inst1.onEventWatch) {
            for (let event in map2) {
                if (map2[event]) {
                    inst1.onEventWatch(event);
                }
            }
        }
    }
}

module.exports = unify;
