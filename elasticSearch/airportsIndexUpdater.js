const _ = require('lodash');
const cities = require('./cities_compressed.json');

const AWS = require("aws-sdk");
AWS.config.update({
    region: "us-east-1",
    accessKeyId: "",
    secretAccessKey: ""
});


const lambda = new AWS.Lambda();
function invokeLambda(lambdaName, lambdaParams) {
    // console.log(JSON.stringify(lambdaParams));
    let lambdaInput = {
        FunctionName: lambdaName,
        Payload: JSON.stringify(lambdaParams),
    };
    return lambda.invoke(lambdaInput).promise();
}

let startTime = Date.now();

function createCitiesPromise(cities) {
    let lambdaParams = {
        method: 'PARTIAL_DOC_UPDATE_WITH_SCRIPT',
        index: 'airports',
        docType: 'airport',
        q: {
            from : 0, size : 100,
            query: {
                match: {}
            }
        }
    };

    let promises = [];
    _.forEach(cities, city => {
        let nameTranslations = _.get(city, 'nameTranslations', []);
        let nameCity = _.get(city, 'nameCity', undefined);

        let names = nameTranslations.split(',');
        nameTranslations = _.uniq(_.compact(names));
        nameTranslations = nameTranslations.map(_.trim);

        let source = '';
        let params = {
            nameTranslations : nameTranslations.join(','),
        };

        if(nameCity) {
            params.nameCity = nameCity;
            source = 'ctx._source.nameCity = params.nameCity; ';
        }
        source = source + " if (!ctx._source.containsKey('nameTranslations')) { ctx._source.nameTranslations = params.nameTranslations }";


        lambdaParams.q.query.match.codeIataCity = city.codeIataCity;
        lambdaParams.script = {
            source: source,
            lang: 'painless',
            params : params
        };

        // console.log(JSON.stringify(lambdaParams));
        promises.push(
            invokeLambda('elastiSearch', lambdaParams).
            then(data => {
                data = JSON.parse(data.Payload);
                let respErr = _.get(data, '[0].error') || _.get(data, 'error') || null;
                if(respErr && (respErr !== 0 || respErr !== '0')) {
                    console.log('In data:: Error occurred while updating iata city: ', city.codeIataCity, respErr);
                }
                return null;
            }).
            catch(err => {
                console.log('Error occurred while updating iata city: ', city.codeIataCity, err);
                return null;
            })
        );
    });
    return promises;
}


let citiesChunks = _.chunk(cities, 10);
console.log('The number of cities to be updated: ', _.size(cities), 'The number of chunks: ', _.size(citiesChunks));

let index = 0;
let finalPromise = citiesChunks.reduce((curPromise, curCitiesChunk) => {
    return curPromise.then(() => {
        console.log('Updating chunk: ', index);
        index = index + 1;
        let curCitiesPromise = createCitiesPromise(curCitiesChunk);
        return Promise.all(curCitiesPromise);
    })
}, Promise.resolve());

finalPromise.then(() => {
    let endTime = Date.now();
    let finalTime = (endTime-startTime)/1000;
    console.log('Updated the final cities chunk in ', finalTime , ' seconds');
});