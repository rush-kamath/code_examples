const Joi = require('@hapi/joi');
const _ = require('lodash');

function createSchemaAndValidate(params) {
    const objectSchema = Joi.object().keys({
        requiredField: Joi.string().required().error(() => Error( 'custom error message')),
        emailField: Joi.string().email().required(),
        numberField: Joi.number().optional(),
        optionalField: Joi.string().optional(),
        phoneNumberField: Joi.string().regex(/^\d{3}-\d{3}-\d{4}$/).required(),
        dateField: Joi.date().max('1-1-2004').iso()
    });
    const userSchema = Joi.object().keys({
        objectField: objectSchema.required(),
    });
    const schema = Joi.object().keys({
        arrayField: Joi.array().items(userSchema).required(),
    });
    return schema.validate(params,  {allowUnknown: true,});
}

let test1 = {
    arrayField: [{
        objectField: {
            requiredField: 'test',
            emailField: 'email@domain.com',
            numberField: 1,
            optionalField: 'optional',
            phoneNumberField: '123-456-7890',
            unknownField: {
                extraField: true
            }
        }
    }]
};
console.log(_.get(createSchemaAndValidate(test1), 'error'));

let test2 = {
    arrayField: [{
        objectField: {

            emailField: 'email',
            numberField: 1,
            optionalField: 'optional',
            unknownField: {
                extraField: true
            }
        }
    }]
};
console.log(_.get(createSchemaAndValidate(test2), 'error'));