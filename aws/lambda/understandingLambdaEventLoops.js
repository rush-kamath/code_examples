async function longTimeConsumingOperation(awsRequestId) {
    // mongo db operation
    console.log('Promise 1 executed', awsRequestId);
}

async function testPromises(awsRequestId) {
    await longTimeConsumingOperation(awsRequestId);
    console.log('Got data');
    new Promise((resolve, reject) => {console.log('Promise 3 executed', awsRequestId); resolve();});
    setTimeout(function() {
        new Promise((resolve, reject) => {console.log('Promise 2 executed', awsRequestId); resolve();});
    }, 100);

}

(async  (event, context = {}) => {
    console.log(context.callbackWaitsForEmptyEventLoop, context.awsRequestId);
    return testPromises(123); // return can be replaced with await. like this return testPromises(123);
}) ();

// ********** when the above code is executed in a stand alone nodejs script, following is the output
/*
undefined undefined
Promise 1 executed 123
Got data
Promise 3 executed 123
Promise 2 executed 123
 */
// nodejs waits until the event loop is empty before exiting

// ********** when the above code is executed in a lambda, following is the output
// Observation1: Promise 2 executes in the second run. There is no impact of callbackWaitsForEmptyEventLoop if the handler is async
/*
// FIRST RUN
true 6de0a9e1-e628-4388-bb28-2116512b31db
Promise 1 executed 6de0a9e1-e628-4388-bb28-2116512b31db
Got data
Promise 3 executed 6de0a9e1-e628-4388-bb28-2116512b31db
 */
/*
SECOND RUN
Promise 2 executed 6de0a9e1-e628-4388-bb28-2116512b31db
true c3d860da-73c5-4059-8391-3fca2ac3f603
Promise 1 executed c3d860da-73c5-4059-8391-3fca2ac3f603
Got data
Promise 3 executed c3d860da-73c5-4059-8391-3fca2ac3f603
 */

// Observation2: in an async handler, there should either be a return or await on promises. If not, there is no guarantee if all promises will execute.
// If the return in this line is removed
// return testPromises(123);
/*
in stand alone script, it will execute same as before.
in lambda, the lambda stops execution at the first longTimeConsumingOperation itself.
 */

// Observation3: In a non-async handler, if the callbackWaitsForEmptyEventLoop = true, then Promise 2 is executed before the response is returned from the lambda
// if the callbackWaitsForEmptyEventLoop = false, then Promise 2 is executed in the next execution
