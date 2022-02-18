const _ = require('lodash');
const aws = require('aws-sdk');
const stream = require("stream");

aws.config.update({
    region: "",
    accessKeyId: "",
    secretAccessKey: ""
});

const documentClient = new aws.DynamoDB.DocumentClient();
const s3 = new aws.S3();
const S3_BUCKET_NAME = '';

/**
 * This script reads the data from dynamoDB and writes to a csv file in S3 bucket. It uses streaming and pagination.
 */

let createProjectionExpression = function(fields) {
    return Array.isArray(fields) ? fields.join(',') : fields;
};

let dbGetWithPagination = function(collection, indexName, keyCondition, filter,
    attribValues, exclusiveStartKey, fields, options) {
    let get_options = {
        TableName: collection,
        IndexName: indexName,
        KeyConditionExpression: keyCondition,
        FilterExpression: filter,
        ExpressionAttributeValues: attribValues,
    };
    if (exclusiveStartKey) {
        get_options.ExclusiveStartKey = exclusiveStartKey;
    }
    if (fields) {
        get_options.ProjectionExpression = createProjectionExpression(fields);
    }
    if (options) {
        if (options.Limit) {
            get_options.Limit = options.Limit;
        }
        if (options.hasOwnProperty('ScanIndexForward')) {
            get_options.ScanIndexForward = options.ScanIndexForward;
        }
    }
    return documentClient.query(get_options).promise();
};

async function generateCsvFileFromDynamo(dynamoInputs, options, fileName) {
    let startTime = Date.now();

    const inStream = new stream.Readable({read() {}});
    let bucket = S3_BUCKET_NAME;
    let params = {Bucket: bucket, Key: `${fileName}`, Body: inStream};

    let uploadPromise = new Promise(async (resolve, reject) => {
        s3.upload(params, function (err, data) {
            if (err !== null) {
                reject(err);
            } else {
                resolve(data);
            }
        });

        let {headers} = options;
        let headerString = '"' + headers.join('","') + '"\n';
        inStream.push(headerString);
        console.log('generateCsvFileFromDynamo: Wrote header to the csv file');

        let lineObjWithDefaults = _(headers).mapKeys().mapValues(function () { return '' }).value();

        do {
            let {Items, LastEvaluatedKey} = await dbGetWithPagination(
                dynamoInputs.TableName, dynamoInputs.IndexName, dynamoInputs.KeyConditionExpression, dynamoInputs.FilterExpression,
                dynamoInputs.ExpressionAttributeValues, dynamoInputs.ExclusiveStartKey || null,
                dynamoInputs.Fields, dynamoInputs.options
            );
            console.log('generateCsvFileFromDynamo: got items from dynamo', _.size(Items), LastEvaluatedKey);

            _.map(Items, obj => {
                let lineObj = _({}).assign(lineObjWithDefaults, _.pick(obj, headers)).value();
                let line = _(lineObj).values().join('","');
                inStream.push(`"${line}"\n`);
            });

            if (!LastEvaluatedKey || _.size(Items) === 0) {
                break;
            }
            query.ExclusiveStartKey = LastEvaluatedKey;
        } while (query.ExclusiveStartKey !== null);

        inStream.push(null);
        inStream.on('end', () => {
            let totalTime = Date.now() - startTime;
            console.log('generateCsvFileFromDynamo: totalTime to create csv in generateCsvFileFromDynamo: ', totalTime);
        });
        inStream.on('error', data => {
            console.log('generateCsvFileFromDynamo: Stream erred', JSON.stringify(data));
            reject(data);
        });
    });

    try {
        let response = await uploadPromise;
        console.log('generateCsvFileFromDynamo: final response: ', response);
        return response;
    } catch (err) {
        console.log(err);
    }
}


let dynamoInputs = {
    TableName: '',
    KeyConditionExpression: '',
    FilterExpression: '',
    ExpressionAttributeValues: {},
};

let options = {
    headers: ['1', '2', '3', '4'],
};
let fileName = 'test.csv';
generateCsvFileFromDynamo(dynamoInputs, options, fileName);
