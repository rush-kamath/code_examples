const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = 'mongodb+srv://';
const _ = require('lodash');


/**
 * Created an aggregation pipeline to get the fields of the collection
 * $objectToArray returns an array in which each object is a key value pair object, one object created for each property of the document.
 * The object is in this format: {k: 'name of property', v: 'value of property'}
 *
 * $$ROOT - is a variable which represents the root of the document
 * the response of $objectToArray operation is set in a new property called arrayofkeyvalue
 *
 * $project - returns the projected properties, in this case arrayofkeyvalue
 **** The final output of the $project phase will be [{_id:id1, arrayofkeyvalue: [{k: 'key1', v: 'val1'}, {k: 'key2', v: 'val2'}] }
 *
 * $unwind - creates an object for each element of an array
 **** The final output of the $unwind phase will be [{_id:id1, arrayofkeyvalue: {k: 'key1', v: 'val1'}}, {_id:id1, arrayofkeyvalue: {k: 'key2', v: 'val2'}}]
 *
 * $group - groups the input documents based on the provided _id. If the _id is null, the group by operation will be done on all the documents in the input.
 * $addToSet creates a set of unique elements.
 *
 * When we group across all the documents across the entire input, we have access to the entire schema for the collection. Creating a set, creates a unique list of properties.
 * ==== Until this point, I used the solution from stack overflow answer =========
 *
 * I needed to get the schemas within nested objects as well. Hence created a second set called nestedObjects which has only those elements that are of type object
 * After this, I run the aggregate pipeline again, this time, instead of $$ROOT, I replace it with each value in the nestedObjects.
 * For deeply nested objects, I just have to change the path accordingly $level1.level2.level3
 * This could be done through recursion.
 */
(async () => {
    let client = await MongoClient.connect(MONGODB_URI);
    const DB_NAME = 'dbName';
    let collection = client.db(DB_NAME).collection('collectionName');
    let response = await collection.aggregate([
        {"$project":{"arrayofkeyvalue":{"$objectToArray":"$$ROOT"}}},
        {"$unwind":"$arrayofkeyvalue"},
        {"$group":{"_id":null,"allkeys":{"$addToSet": "$arrayofkeyvalue.k"}, "nestedObjects": {"$addToSet": {$cond: {if: {$eq: [ {$type: "$arrayofkeyvalue.v"}, "object"]}, then: {$concat: "$arrayofkeyvalue.k"}, else: null }}}}}
    ]).toArray();

    console.log(JSON.stringify(response));
    await client.close();

})();

