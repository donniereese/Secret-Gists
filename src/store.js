// node=persist localStorage-like persistent storage
const store = require('node-persist');

// Setup for node-persist
//you must first call storage.init
store.init({
    dir: 'data',
    parse: JSON.parse,
    encoding: 'utf8',
    interval: 2000,
    expiredInterval: 2 * 60 * 60 * 1000
});

const getKeysStored = () => {
    return [];
}

const getItemByKey = (k) => {
    store.setItem('name','yourname')
    .then(function() {
        return storage.getItem('name')
    })
    .then(function(value) {
        console.log(value); // yourname
    })
};


module.exports = {
    getItemByKey
}


