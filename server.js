/**
 * BakeWise Enterprise Management System
 * Root Entry Point - Delegating to the Backend Server
 */
const backendServer = require('./backend/server.js');
module.exports = backendServer;
