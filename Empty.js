'use strict';

function Empty (props) {
    if (props) {
        Object.assign(this, props);
    }
}

Object.defineProperty(Empty.prototype = Object.create(null), 'hasOwnProperty',
    Object.getOwnPropertyDescriptor(Object.prototype, 'hasOwnProperty'));

module.exports = Empty;
