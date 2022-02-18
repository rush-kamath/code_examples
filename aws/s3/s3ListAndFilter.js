const AWS = require('aws-sdk');
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');

AWS.config.update({
    region: "",
    accessKeyId: "",
    secretAccessKey: ""
});
const S3_PATH = '';
const PREFIX = '';
const s3 = new AWS.S3({endpoint: 's3.amazonaws.com'});

async function getFilesFromBucket() {
    let params = {Bucket: S3_PATH, Prefix: PREFIX};

    let continuationToken = null;
    let list = [];
    do {
        if(continuationToken) {
            params.ContinuationToken = continuationToken;
        }
        let data = await s3.listObjectsV2(params).promise();
        list = list.concat(data.Contents);
        continuationToken = data.NextContinuationToken;

    } while(!_.isEmpty(continuationToken));
    return list;
}

getFilesFromBucket()
.then(async list => {
    console.log(list);
    let filteredList = _.filter(list, file => {
        let date = moment(new Date(file.LastModified)).format('MM/DD/YYYY');
        return date === '04/01/2021';
    });
    for(let i = 0; i < _.size(filteredList); i++) {
        let file = filteredList[i];
        let Key = file.Key;
        let getParams = {
            Bucket: S3_PATH,
            Key
        };
        let s3Object = await s3.getObject(getParams).promise();
        let fileName = 'downloaded/' + _.last(_.split(Key, '/'));
        fs.writeFileSync(fileName, s3Object.Body);
    }
});
