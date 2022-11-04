
// ***** 1. Optional chaining - a nice to have feature  ************
let box = {
    innerBox: {},
    nullFunction: function() { return null; },
    // non-existent method foo() and members bar
};
if (box?.innerBox?.foo) {  // old style (box.innerBox && box.innerBox.foo)
    // navigate object graph safely
    console.log('Foo exists in box.innerBox')
}
//also works for functions:
console.log(box.nullFunction()?.foo);
// and nonexistent methods and members:
console.log(box?.foo && box?.bar);

// ***** 2. BigInt ************
let mySafeBigNumber = 90071992547409929090900n;
console.log(typeof mySafeBigNumber);
try {
    console.log(mySafeBigNumber - 12);
} catch(err) {
    console.log('Cannot mix BigInt and other types during operations. ');
    console.log(`the correct way to do the operation: ${mySafeBigNumber - 12n}`);
}

// ***** 3. Nullish coalescing ************
// ?? operator handles nullish values - null or undefined
// || operator handles falsy values - false, 0, empty strings, null and undefined
let answer = 0;
console.log(answer ?? 42); // prints 0
console.log(answer || 42); // prints 42

answer = undefined;
console.log(answer ?? 42); // both print 42
console.log(answer || 42); //

// ***** 4. String.prototype.matchAll ************
let text = "The best time to plant a tree was 20 years ago. The second best time is now.";
let regex = /(?:^|\s)(t[a-z0-9]\w*)/gi; // matches words starting with t, case insensitive
let result = text.matchAll(regex);
for (let match of result) {
    console.log(match[1]);
}

// ***** 5. Promise.allSettled ************
let promise1 = Promise.resolve("OK");
let promise2 = Promise.reject("Not OK");
let promise3 = Promise.resolve("After not ok");
Promise.allSettled([promise1, promise2, promise3])
    .then((results) => console.log(results))
    .catch((err) => console.log("error: " + err));

