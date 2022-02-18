/**
 * I wrote this for a requirement where I had to extra functionality for existing methods.
 * I did not want to modify the existing methods since I would have to modify it in a lot of places.
 * Instead, I added this overrider that I could call in one place and continue calling the existing methods without any change.
 */

let overriderClass = (function() {
    let overridePublicFunction = function (classToOverride) {
        let oldFunc1 = classToOverride.function1;
        oldFunc1.bind(classToOverride);
        classToOverride.function1 = function() {
            console.log('In overridden function1');
            return oldFunc1();
        }
    };

    let overridePrivateFunction = function (functionToOverride) {
        return function() {
            console.log('In overridden function2');
            return functionToOverride();
        }
    };

    return {
        overridePublicFunction,
        overridePrivateFunction
    };
})();


let simpleClass = (function() {
    let classVariable = 1;
    let function1 = function() {
        console.log('In function1');
        return classVariable;
    };

    let privateFunction = function() {
        console.log('In privateFunction');
    };

    let function2 = function() {
        privateFunction();
    };

    let overrideFunctions = function() {
        overriderClass.overridePublicFunction(this);
        privateFunction = overriderClass.overridePrivateFunction(privateFunction);
    };

    return {
        function1,
        function2,
        overrideFunctions
    };
})();

console.log('============ BEFORE OVERRIDE =========');
console.log(simpleClass.function1());
simpleClass.function2();
simpleClass.overrideFunctions();
console.log('============ AFTER OVERRIDE =========');
console.log(simpleClass.function1());
simpleClass.function2();
