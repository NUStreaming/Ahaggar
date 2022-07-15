const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const args = process.argv.slice(2);
console.log('Proxy Args: ', args);
const PORT = args[0]

// host.docker.internal will reach the main host nginx server
const url = "http://host.docker.internal:8082"
const HOST = "localhost";

// Create Express Server
const app = express();

 //cors
 app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

// Proxy endpoints
/*
app.use('/proxy', createProxyMiddleware({
    target: url,
    changeOrigin: true,
    pathRewrite: {
        [`^/proxy`]: '',
    },
 }));
 */
 app.use('/', createProxyMiddleware({
    target: url,
    changeOrigin: true,
 }));

 // Start the Proxy
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
 });
