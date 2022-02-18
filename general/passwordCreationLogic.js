const _ = require('lodash');
const PASSWORD_MAX_LENGTH = 99;
const PASSWORD_MIN_LENGTH = 12;
const UPPERCASE_RE = /([A-Z])/g;
const LOWERCASE_RE = /([a-z])/g;
const NUMBER_RE = /([\d])/g;
const SPECIAL_CHAR_RE = /([\W\_])/g;
const CHARSET_ALPHA_CAPS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const CHARSET_ALPHA_SMALL = [..."abcdefghijklmnopqrstuvwxyz"];
// '<' is not in this list because when it is part of the html email body, it messes up the password sent out.
const CHARSET_SPECIAL_CHARS = [..."^$*.[]{}()?-\"!@#%&/\\,>':;|_~`"];
const CHARSET_NUMBERS = [..."0123456789"];
const PASSWORD_CHARSET = [...CHARSET_ALPHA_CAPS, ...CHARSET_ALPHA_SMALL, ...CHARSET_SPECIAL_CHARS, ...CHARSET_NUMBERS];

function isValidPassword(password) {
    let uc = !_.isEmpty(password.match(UPPERCASE_RE));
    let lc = !_.isEmpty(password.match(LOWERCASE_RE));
    let n = !_.isEmpty(password.match(NUMBER_RE));
    let sc = !_.isEmpty(password.match(SPECIAL_CHAR_RE));
    return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH && uc && lc && n && sc;
}

function createPassword() {
    let password = '';
    while(!isValidPassword(password, _)) {
        password = [...Array(12)]
            .map(i => PASSWORD_CHARSET[Math.random() * PASSWORD_CHARSET.length | 0])
            .join('');
    }
    return password;
}

console.log(createPassword());