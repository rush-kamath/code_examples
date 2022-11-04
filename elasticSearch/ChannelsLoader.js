(async () => {
  const AWS = require('aws-sdk');
  const _ = require('lodash');

  AWS.config.update({
    region: 'us-east-1',
    accessKeyId: "", //PROD
    secretAccessKey: ""
  });

  const lambda = new AWS.Lambda();
  let docClient = new AWS.DynamoDB.DocumentClient();

  let insertChannels = channels => {
    let params = {
      method: 'BULK_INSERT',
      index: "channels-index",
      docIdField: "channelId"
    };
    console.log('trying to load channels: ', _.size(channels));
    let promises = [];
    let chunks = _.chunk(channels, 10);
    for(let index = 0; index < _.size(chunks); index++) {
      params.docs = chunks[index];
      promises.push(lambda.invoke({
        FunctionName: 'elastiSearch',
        Payload: JSON.stringify(params, null, 0),
        InvocationType: "Event"
      }).promise().catch(err => {console.log('Error occurred:', err)}));
    }
    return Promise.all(promises);
  };

  async function scanChannels(totalProcessedChannels = 0, ExclusiveStartKey) {
    let params = {
      TableName: 'Channels',
      ExclusiveStartKey
    };
    let data = await docClient.scan(params).promise();
    let channels = data.Items;
    return insertChannels(channels)
    .then(() => {
      console.log('Total loaded channels: ', totalProcessedChannels + _.size(channels));
      if (data.LastEvaluatedKey) {
        console.log('LastEvaluatedKey: ', data.LastEvaluatedKey);
        return scanChannels(totalProcessedChannels + _.size(channels), data.LastEvaluatedKey);
      }
    })
  }

  let startTime = Date.now();
  await scanChannels();
  console.log('total time: ', Date.now() - startTime);
})();
