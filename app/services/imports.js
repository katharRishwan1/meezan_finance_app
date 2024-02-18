const exportsJson = {
    express: require('express'),
    dotenv: require('dotenv'),
    mongoose: require('mongoose'),
    helment: require('helmet'),
    cors: require('cors'),
    xss: require('xss-clean'),
    fs: require('fs'),
    router: require('express').Router(),
    morgan: require('morgan'),
    bodyParser: require('body-parser'),
    bcrypt: require('bcryptjs'),
    jwt: require('jsonwebtoken'),
    Joi: require('joi'),
    axios: require('axios'),
    asyncRedis: require('async-redis'),
    nodeMailer: require('nodemailer'),

};
module.exports = {
    ...exportsJson,
    app: new exportsJson.express(),
}