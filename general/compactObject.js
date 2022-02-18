const _ = require('lodash');

function removeFalsyValFromObject(object) {
    Object.entries(object).forEach(([k, v]) => {
        if (_.isObject(v)) {
            removeFalsyValFromObject(v);
        }
        if (_.isEmpty(_.toString(v)) || _.isNaN(v) || _.isEmpty(v)) {
            delete object[k];
        }
    });
    if (_.isEmpty(object) || _.isNaN(object)) {
        return null;
    }
    return object;
}

console.log(removeFalsyValFromObject({emptyProperty: '', emptyObject: {}, objectWithProps: {empty: '', prop1: 'prop'}}));
