require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const GitHubApi = require('github');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

// Err Messages
const Err = require('./ErrOnTheSideOfCertainty.js');

// create application/json parser
const jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// Import Store Manager Wrapper for Simple Local Storage
const store = require('./store.js');

const githubUsername = 'donniereese';  // TODO: your GitHub username here
const github = new GitHubApi({ debug: true });
const server = express();

server.use(jsonParser);

// Access Settings
// server.use((req, res, next) => {
//    res.header('Access-Control-Allow-Origin', '*');
//    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
//    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
//    res.header('Access-Control-Allow-Credentials', 'true');
// });

// Generate an access token: https://github.com/settings/tokens
// Set it to be able to create gists
github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
});

// Set up the encryption - use process.env.SECRET_KEY if it exists
// TODO either use or generate a new 32 byte key
let key = null;
if (process.env.SECRET_KEY) {
    key = nacl.util.decodeBase64(process.env.SECRET_KEY);
} else {
    key = nacl.randomBytes(32);
    // save this key
}

// Wrapper for Users Access Control
class UsersWrapper {
    constructor() {
        this._users = {};
        this._auths = {};
        this._usedAuths = [];

        this._template = {
            username: null,
            token: null,
            session: null,
            lastAccess: null,
            apiKey: null
        }
    }

    addUser(uObj) {
        // Make sure all data is there
        if (!uObj.username || !uObj.password || !uObj.email) return false;
        // encrypt the password
        uObj.password = nacl.hash(nacl.util.decodeUTF8(uObj.password));
        // push the object to the stack
        this._users[uObj.username] = uObj;

        return this._users[uObj.username];
    }

    removeUser(authStr) {

    }

    validateAuthToken(authStr) {
        // not sure yet, so just say yes until filled out
        return true;
    }

    authTokenExists(authStr) {
        // if authStr is empty or not supplied
        if (!authStr || authStr === '') return false;
        // return false if the index doesn't exist
        return !!this._auths[authStr];
    }

    getUserByAuth(authStr) {
        // Verify it exists
        if (!this.authTokenExists(authStr)) return null;
        // return value
        return this._users[this._auths[authStr]];
    }

    getUserByUsername(unStr) {
        // Verify str
        if (!unStr || unStr === '') return null;
        // Get contents of potential user
        const u = this._users[unStr];
        // Check user
        if (!u) return null;
        // If users is an object
        if (typeof u === 'object') return null;
        // return the user otherwise
        return u;
    }
}

const activeUsers = new UsersWrapper();

const checkAuth = (req, res, next) => {
    if (!req.headers.auth)
        return res.json(Err.Auth.Missing);

    if (!activeUsers.authTokenExists(req.headers.auth))
        return res.json(Err.Auth.Expired);

    if (!activeUsers.authTokenValid(req.headers.auth))
        return res.json(Err.Auth.Invalid);

    req.userObj = activeUsers.getUserForAuth(req.headers.auth);

    if (!req.userObj)
        return res.json(Err.User.AccountErr);

    next();
};

server.get('/', (req, res) => {
    // TODO Return a response that documents the other routes/operations available
    res.send('hi');
});

server.get('/gists', checkAuth, (req, res) => {
    // TODO Retrieve a list of all gists for the currently authed user
});

server.get('/key', checkAuth, (req, res) => {
    // TODO Return the secret key used for encryption of secret gists
});

server.get('/secretgist/:id', checkAuth, (req, res) => {
    // TODO Retrieve and decrypt the secret gist corresponding to the given ID
    // Get ide from props
    const { id } = req.props;
    // Check to see if the id is valid
if (!id) return res.json({ error: 'gist id either invalid or url is malformed. Please try again.' });
    // get the gist of it
    github.gists.get({ id })
        .then((gist) => {
            // read returned gist
            if (!gist) return res.json({ error: 'gist returned null or not found. Please try again' });
            // split it?
            res.json(gist);
        })
        .catch((err) => {
            // Catch and send error
            return res.json(err);
        });
});

server.post('/create', checkAuth, (req, res) => {
    const { name, content } = req.body;
    // Check for the body content
    // TODO make a default error message for this
    if (!name || !content) return res.json({ error: 'Request Data Missing', message: 'Data was missing from the post request' });
    // Construct the object for the github request
    const files = { [name]: { content } };
    // Make the github request
    github.gists.create({ files, public: false })
        .then((response) => {
            res.json(response.data);
        })
        .catch((err) => {
            res.json(err);
        });
});

server.post('/createsecret', checkAuth, urlencodedParser, (req, res) => {
    // TODO Create a private and encrypted gist with given name/content
    // NOTE - we're only encrypting the content, not the filename
    // To save, we need to keep both encrypted content and nonce
    const { name, content } = req.body;
    // Check for the body content
    // TODO make a default error message for this
    if (!name || !content) return res.json({ error: 'Request Data Missing', message: 'Data was missing from the post request' });
    // Get or create the nonce
    const nonce = nacl.randomBytes(24);
    // Encrypt the content with the nonce and the key
    const ciphertext = nacl.secretbox(nacl.util.decodeUTF8(content), nonce, key);
    // To save, we need to keep both encrypted content and nonce
    const blob = nacl.util.encodeBase64(nonce) + nacl.util.encodeBase64(ciphertext);
    // Construct the object for the github request
    const files = { [name]: { content: blob } };
    // Make the github request
    github.gists.create({ files, public: false })
        .then((response) => {
            res.json(response.data);
        })
        .catch((err) => {
            res.json(err);
        });
});

server.post('/setapikey', checkAuth, urlencodedParser, (req, res) => {
    // TODO let someone set this for a registered account
    const { apiKey, auth } = req.body;
    // Check to see if the key was passed
    // TODO create error code for this
    if (!apiKey || apiKey === '') return res.json({ error: 'api key was not provided or was empty' });
    // Get auth info
    const authInfo = activeUsers._auths[auth];
    // Check authed and authed user still exists
    if (!authInfo || !activeUsers._users[authInfo.username]) return req.json('Error fetching account info or verify auth access');
    // set the api key for the user
    activeUsers._users[authInfo.username].apiKey = apiKey;

    res.json({ status: 'success' })
});

/* OPTIONAL - if you want to extend functionality */
server.post('/login', urlencodedParser, (req, res) => {
    // TODO log in to GitHub, return success/failure response
    // This will replace hardcoded username from above
    // const { username, oauth_token } = req.body;
    const { username, password } = req.body;
    // Get the values and check them
    if (!username || !password) return res.json(Err.Auth.Signin);
    // Find User
    const user = activeUsers.getUserByUsername(username);
    // Check to make sure a user was returned
    if (!user) return res.json(Err.Auth.Signin);
    // Check Password Hash
    if (user.password !== nacl.hash(nacl.util.encodeUTF8(password))) return res.json(Err.Auth.Signin);
    // Good enough validation for this case
    // Add the user's auth token to the list and return the token.
    // const userToken = user.token || null;
    // Generate random auth key
    let genAuth = null;
    while (!genAuth) {
        const temp = nacl.randomBytes(14);
        if (!activeUsers._usedAuths.includes(temp)) genAuth = temp;
    }
    // Add it to the current alive auths
    activeUsers._auths[genAuth] = user.username;
    // add it to the used auths
    activeUsers._usedAuths.push(genAuth);
    // send auth to user
    res.json({ auth: genAuth });
});

server.post('/register', urlencodedParser, (req, res) => {
    const { username, password, email } = req.body;
    // Get the values and check them
    if (!username || !password || !email) return res.json(Err.Account.Creation);
    // Create Account
    const au = activeUsers.addUser({
        username,
        password,
        email
    });
    // Check to see the result of the add user
    if (!au) return res.json(Err.Account.Creation);
    // Return the user
    res.json({ status: 'success' });
});

/*
Still want to write code? Some possibilities:
-Pretty templates! More forms!
-Better management of gist IDs, use/display other gist fields
-Support editing/deleting existing gists
-Switch from symmetric to asymmetric crypto
-Exchange keys, encrypt messages for each other, share them
-Let the user pass in their private key via POST
*/

server.listen(4000);
