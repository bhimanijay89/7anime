/* eslint-disable */
const bcrypt = require("bcryptjs");

bcrypt.hash("bhimanijay", 12).then(hash => {
    console.log(hash);
});
