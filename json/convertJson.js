const fromJSONObjects = require("./users");
const _ = require('lodash');

function convert(fromObj) {
    let toJSONObjWithDefaults = {
        userName: '',
        userAge: '',
        dateOfBirth: '',
        location: 'Bangalore',
        languages: []
    };
    let keys = _.keys(fromObj);
    _.forEach(keys, key => {
        let value = fromObj[key];
        // apply any transformations like for dob etc
        switch(key) {
            case 'name':
                toJSONObjWithDefaults.userName = _.toUpper(value); break;
            case 'age':
                toJSONObjWithDefaults.userAge = value; break;
            case 'dob':
                toJSONObjWithDefaults.dateOfBirth = value; break;
            case 'language':
                toJSONObjWithDefaults.languages = value.sort(); break;
        }
    });

    return toJSONObjWithDefaults;
}

let toJSONObjects = fromJSONObjects.map(convert);
console.log(toJSONObjects);

