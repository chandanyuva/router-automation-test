const { Server } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const init = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: 'http://localhost:5173', // Your React frontend
            credentials: true
        }
    });

    // Authentication Middleware for WebSockets
    io.use((socket, next) => {
        try {
            const cookies = cookie.parse(socket.request.headers.cookie || '');
            const token = cookies.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
            socket.user = decoded; // Attach user info to the socket
            next();
        } catch (err) {
            logger.error('WebSocket Auth Error', { error: err.message, stack: err.stack });
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info('Client connected via WebSocket', { email: socket.user.email, id: socket.id });

        socket.on('disconnect', () => {
            logger.info('Client disconnected', { email: socket.user.email });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { init, getIO };