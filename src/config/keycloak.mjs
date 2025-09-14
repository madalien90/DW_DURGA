// src/config/keycloak.mjs
import session from 'express-session';
import Keycloak from 'keycloak-connect';
import dotenv from 'dotenv';
dotenv.config();

const memoryStore = new session.MemoryStore();

function setupKeycloak(app) {
    const memoryStoreForSession = memoryStore;
    app.use(session({
        secret: process.env.SESSION_SECRET || 'change_this',
        resave: false,
        saveUninitialized: true,
        store: memoryStoreForSession,
        cookie: { secure: false }
    }));

    const keycloak = new Keycloak({ store: memoryStoreForSession }, {
        "realm": process.env.KEYCLOAK_REALM,
        "auth-server-url": process.env.KEYCLOAK_URL,
        "ssl-required": "external",
        "resource": process.env.KEYCLOAK_CLIENT_ID,
        "credentials": { "secret": process.env.KEYCLOAK_CLIENT_SECRET },
        "confidential-port": 0
    });

    app.use(keycloak.middleware());
    return keycloak;
}

export { setupKeycloak };