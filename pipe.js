'use strict';

const relayEvents = require('./relay.js');

function pipe (watchable1, watchable2) {
    return relayEvents(watchable1, watchable2);
}

module.exports = pipe;
