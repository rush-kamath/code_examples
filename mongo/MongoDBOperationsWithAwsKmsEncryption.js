'use strict';
const aws = require('aws-sdk');
const secretMgr = new aws.SecretsManager();
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = 'mongodb+srv://';
const _ = require('lodash');
const ClientEncryption = require('mongodb-client-encryption').ClientEncryption;

const keyVaultNamespace = 'encryption.__keyVault';
const kmsProviders = {
    "aws":{"accessKeyId":"","secretAccessKey":""}
};
const ENCRYPTION_ALGORITHM = {
    DETERMINISTIC: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
    RANDOM: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
};
const ENCRYPTION_KEYS_FOR_TABLES = {
    // dbName.tableName : keyAltName
    'encryption.People_test': 'PeopleTableKey'
};
const ERROR_MESSAGES = {
    ENCRYPTION_KEY_MISSING: 'Encryption key not setup for the collection',
    UNSUPPORTED_FIELD_TYPE: 'Unsupported field type for encryption'
};

let cachedDb = null;
let clientEncryption = null;

const ACTIONS = {
    query: 'query',
    aggregate: 'aggregate',
    insertOne: 'insertOne',
    insertArray: 'insertArray',
    update: 'update',
    del: 'delete',
};

let connectToDatabase = () => {
    console.log('=> connect to database');

    if (cachedDb) {
        console.log('=> using cached database instance');
        return Promise.resolve(cachedDb);
    }

    let uri = MONGODB_URI;
    return MongoClient.connect(uri, { useUnifiedTopology:true })
    .then(client => {
        cachedDb = client;
        clientEncryption = new ClientEncryption(client, {
            keyVaultNamespace,
            kmsProviders,
        });
        return cachedDb;
    });
};

function queryCollection(collection, event) {
    return collection
        .find(event.query, event.projection)
        .sort(event.sort)
        .collation(event.collation)
        .skip(event.skip)
        .limit(event.limit)
        .toArray()
        .then(result => {
            console.log('=> found something');
            return { statusCode: 200, body: result };
        })
        .catch(err => {
            console.log('=> an error occurred: ', err);
            return { statusCode: 500, body: err };
        });
}

async function decryptResponseFields(body = [], securedFields) {
    for(let i = 0; i < _.size(body); i++) {
        let doc = body[i];
        for(let j = 0; j < _.size(securedFields); j++) {
            let securedFieldName = securedFields[j];
            let fieldValue = _.get(doc, securedFieldName);
            if(_.isNil(fieldValue)) {
                continue;
            }
            try {
                let decryptedFieldValue = await clientEncryption.decrypt(fieldValue);
                _.set(doc, securedFieldName, decryptedFieldValue);
            } catch(err) {
                // ignoring the error
            }
        }
    }
    return body;
}

let query = async (db, event) => {
    try {
        let {securedFields, query, collection} = event;
        let dbCollection = await db.collection(collection);
        if(_.isEmpty(securedFields)) {
            console.log('no secured fields in request');
            return queryCollection(dbCollection, event);
        }

        let encryptionKey = getEncryptionKeyForCollection(dbCollection);
        event.query = await encryptObjectFields(query, securedFields, encryptionKey);
        let results = await queryCollection(dbCollection, event);
        if (results.statusCode === 500) {
            return results;
        }

        results.body = await decryptResponseFields(results.body, securedFields);
        return results;

    } catch(err) {
        return { statusCode: 500, body: err.message };
    }
};

let aggregate = (db, event) => {
    console.log(event.query);
    return db
        .collection(event.collection)
        .aggregate(event.query)
        .sort(event.sort)
        .skip(event.skip)
        .limit(event.limit)
        .toArray()
        .then(result => {
            console.log('=> aggregate found something');
            return { statusCode: 200, body: result };
        })
        .catch(err => {
            console.log('=> an error occurred in aggregate: ', err);
            return { statusCode: 500, body: err };
        });
};

function isDouble(value) {
    return _.isNumber(value) && value % 1 > 0;
}
function getEncryptionAlgorithm(fieldValue) {
    if(_.isString(fieldValue) || _.isInteger(fieldValue)) {
        return ENCRYPTION_ALGORITHM.DETERMINISTIC;
    }

    if(isDouble(fieldValue) || _.isBoolean(fieldValue) || _.isObject(fieldValue) || _.isArray(fieldValue)) {
        return ENCRYPTION_ALGORITHM.RANDOM;
    }

    throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_FIELD_TYPE}: ${fieldValue}` );
}
async function encryptObjectFields(obj, securedFields, encryptionKey) {
    for(let i = 0; i < _.size(securedFields); i++) {
        let fieldName = securedFields[i];
        let fieldValue = _.get(obj, fieldName);
        if(_.isNil(fieldValue)) {
            continue;
        }

        let encryptedFieldValue = await clientEncryption.encrypt(fieldValue, {
            algorithm: getEncryptionAlgorithm(fieldValue),
            keyAltName: encryptionKey
        });
        _.set(obj, fieldName, encryptedFieldValue);
    }
    return obj;
}

function insertManyIntoCollection(collection, documents) {
    return collection
        .insertMany(documents, {ordered: true})
        .then(() => {
            console.log('=> insert one something');
            return { statusCode: 200, body: 'success' };
        })
        .catch(err => {
            console.log('=> an error occurred: ', err);
            return { statusCode: 500, body: err };
        });
}

function getEncryptionKeyForCollection(collection) {
    let collectionNamespace = collection.namespace;
    let encryptionKey = ENCRYPTION_KEYS_FOR_TABLES[collectionNamespace];
    if(_.isEmpty(encryptionKey)) {
        console.log(`insertOne error: ${ERROR_MESSAGES.ENCRYPTION_KEY_MISSING}: ${collectionNamespace}`);
        throw new Error(`${ERROR_MESSAGES.ENCRYPTION_KEY_MISSING}. Collection name ${collectionNamespace}`);
    }
    return encryptionKey;
}

let insertOne = async (db, event) => {
    event.documents = [event.document];
    return insertArray(db, event);
};

let insertArray = async (db, event) => {
    try {
        let {securedFields, documents, collection} = event;
        let dbCollection = await db.collection(collection);
        if(_.isEmpty(securedFields)) {
            console.log('no secured fields in request');
            return insertManyIntoCollection(dbCollection, documents);
        }
        let encryptionKey = getEncryptionKeyForCollection(dbCollection);
        for(let i = 0; i < _.size(documents); i++) {
            documents[i] = await encryptObjectFields(documents[i], securedFields, encryptionKey);
        }
        console.log(`${documents}`);
        return insertManyIntoCollection(dbCollection, documents);
    } catch(err) {
        return { statusCode: 500, body: err.message };
    }
};

async function updateCollection(collection, document, query, options) {
    let doc = {};
    doc['$set'] = document;
    return collection
        .updateOne(query, doc, options)
        .then(() => {
            console.log('=> update something');
            return { statusCode: 200, body: 'success' };
        })
        .catch(err => {
            console.log('=> an error occurred: ', err);
            return { statusCode: 500, body: 'error' };
        });
}

let update = async (db, event) => {
    try {
        let {securedFields, document, collection, options, query} = event;
        let dbCollection = await db.collection(collection);
        if(_.isEmpty(securedFields)) {
            return updateCollection(dbCollection, document, query, options);
        }

        let encryptionKey = getEncryptionKeyForCollection(dbCollection);
        document = await encryptObjectFields(document, securedFields, encryptionKey);
        query = await encryptObjectFields(query, securedFields, encryptionKey);
        return updateCollection(dbCollection, document, query, options);
    } catch (err) {
        return { statusCode: 500, body: err.message };
    }
};

async function deleteFromCollection(collection, query) {
    return collection
    .deleteOne(query)
    .then(() => {
        console.log('=> delete something');
        return { statusCode: 200, body: 'success' };
    })
    .catch(err => {
        console.log('=> an error occurred: ', err);
        return { statusCode: 500, body: err };
    });
}

let del = async (db, event) => {
    try {
        let {securedFields, collection, query} = event;
        let dbCollection = await db.collection(collection);
        if(_.isEmpty(securedFields)) {
            return deleteFromCollection(dbCollection, query);
        }

        let encryptionKey = getEncryptionKeyForCollection(dbCollection);
        query = await encryptObjectFields(query, securedFields, encryptionKey);
        return deleteFromCollection(dbCollection, query);
    } catch (err) {
        return { statusCode: 500, body: err.message };
    }
};

let handler = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    console.log('event: ', event);
    return connectToDatabase()
        .then(client => {
            switch (event.action) {
                case ACTIONS.query: {
                    return query(client.db(event.db), event);
                }
                case ACTIONS.aggregate: {
                    return aggregate(client.db(event.db), event);
                }
                case ACTIONS.insertOne: {
                    return insertOne(client.db(event.db), event);
                }
                case ACTIONS.insertArray: {
                    return insertArray(client.db(event.db), event);
                }
                case ACTIONS.update: {
                    return update(client.db(event.db), event);
                }
                case ACTIONS.del: {
                    return del(client.db(event.db), event);
                }
                default: {
                    console.log('=> Invalid action');
                    callback(null, { statusCode: 500, body: 'Invalid action' });
                }
            }
        }).then(result => {
            console.log('=> returning result: ', result);
            callback(null, result);
        }).catch(err => {
            console.log('=> an error occurred: ', err);
            callback(err);
        });
};


// ====================
/*
1. https://docs.mongodb.com/manual/reference/security-client-side-automatic-json-schema/ => only strings and numbers can be encrypted with deterministic algo.
double, decimal128, bool, object, array, javascriptWithScope -> can be encrypted only with random algo

 */
function callback(error, result) {
    console.log(`Final output: ${JSON.stringify(result)}`);
}
let context = {};
let insert_event = {
    action: 'insertArray', //insertOne
    db: 'encryption',
    collection: 'People_test',
    documents: [{
        "userName": "userName22222",
        "userId": "userId22222",
        "emailAddress": "emailAddress2",
        "phoneNumbers": {
            "personal": {
                "land": "1233",
                "mobile": "1111",
            },
        },
        encryptedObject: {a: 1},
        number: 1,
        double: 1.22,
        array: [1, 2]
    }, {
        "userName": "userName33333",
        "userId": "userId3333",
        "emailAddress": "emailAddress3",
        "phoneNumbers": {
            "personal": {
                "land": "1233",
                "mobile": "1111",
            },
            "office": {
                "land": "1233",
                "mobile": "1111",
            }
        }
    }, {
        "userName": "userName44444",
        "userId": "userId4444",
        "emailAddress": "emailAddress4",
        "phoneNumbers": {
            "personal": {
                "land": "1233",
                "mobile": "1111",
            },
            "office": {
                "land": "1233",
                "mobile": "1111",
                "satellite": "898098"
            }
        },
    }, ],
    securedFields: ['emailAddress', 'phoneNumbers.personal.land', 'phoneNumbers.personal.mobile', 'encryptedObject', 'number', 'double', 'array']
};
let update_event = {
    action: 'update',
    db: 'encryption',
    collection: 'People_test',
    query: {"emailAddress": "emailAddress3"},
    document: {
        "userName": "updatedUserName2",
        "userId": "userId223111",
        "emailAddress": "emailAddress2",
        "phoneNumbers": {
            "land": "1232"
        },
        encryptedObject: {a: 1},
        number: 1,
        double: 1.22,
        array: [1, 2]
    },
    securedFields: ['emailAddress', 'phoneNumbers.land', 'phoneNumbers.satellite', 'encryptedObject', 'number', 'double', 'array']
};
let delete_event = {
    action: 'delete',
    db: 'encryption',
    collection: 'People_test',
    query: {"emailAddress": "emailAddress4"},
    securedFields: ['emailAddress', 'phoneNumbers.land', 'phoneNumbers.satellite', 'encryptedObject', 'number', 'double', 'array']
};
let get_event = {
    action: 'query',
    db: 'encryption',
    collection: 'People_test',
    query: {"userName":"updatedUserName2"},
    securedFields: ['emailAddress', 'phoneNumbers.land', 'phoneNumbers.satellite', 'encryptedObject', 'number', 'double', 'array'],
    projection: {},
    sort: {},
    skip: 0,
    limit: 20
};

(async () => {
    await handler(insert_event, context, callback);
    await cachedDb.close();
})();

