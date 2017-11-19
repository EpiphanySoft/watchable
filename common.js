'use strict';

function Empty (props) {
    if (props) {
        Object.assign(this, props);
    }
}

// Nobody expects "obj.hasOwnProperty()" to throw...
Object.defineProperty(
    Empty.prototype = Object.create(null),
    'hasOwnProperty',
    Object.getOwnPropertyDescriptor(Object.prototype, 'hasOwnProperty'));

module.exports = {
    Empty,

    getDescriptors (object) {
        let descriptors = {};

        for (let name of Object.getOwnPropertyNames(object)) {
            if (name !== 'constructor') {
                descriptors[name] = Object.getOwnPropertyDescriptor(object, name);
            }
        }

        return descriptors;
    },

    indexOf (array, item) {
        return array ? array.indexOf(item) : -1;
    },

    symbols: {
        actual:   Symbol('actualListener'),
        firing:   Symbol('eventFiring'),
        relayers: Symbol('eventRelayers'),
        watchers: Symbol('eventWatchers'),
        STOP:     Symbol('stopFiring')
    }
};
