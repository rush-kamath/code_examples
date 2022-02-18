const _ = require('lodash');

function promiseCreator(val, index) {
    console.log(`${index} : ${val}`);
    return Promise.resolve(val);
}

function reduce(input) {
    let finalChunkPromise = _.chunk(input, 2).reduce(
        (chunkPromise, currInputChunk) => { // the initial chunkPromise is the Promise.resolve from line 16. The rest are the Promise.all from line 13
            return chunkPromise.then(() => {
                let currChunkPromises = currInputChunk.map(promiseCreator);
                return Promise.all(currChunkPromises);
            });
        },
        Promise.resolve()
    );

    if (_.isUndefined(finalChunkPromise)) {
        return Promise.resolve();
    }
    return finalChunkPromise;
}

/**
 * The reason I created this logic is because if I create the array of promises before hand, they start executing immediately.
 * If an API has a limit on the number of calls that can be made, creating an array of promises would always exceed the limit.
 * Instead, created chunks of the input, created promises only for that chunk and executed just that chunk.
**/
let input = [1,2,3,4,5,6,7,8];
reduce(input)
.then(() => {
    console.log('reduce done')
});

// the same thing can now be done in a simple manner with async/await.
(async () => {
    let chunks = _.chunk(input, 2);
    for(let i = 0; i < _.size(chunks); i++) {
        let currChunk = chunks[i];
        await currChunk.map(promiseCreator);
    }
    console.log('async/await done');
})();

