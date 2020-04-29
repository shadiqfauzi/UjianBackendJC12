const mysql = require('mysql')
const util = require('util')

const db = mysql.createConnection({
    host: 'localhost',
    user: 'shadiq',
    password: 'root',
    database: 'ujian_backend_saf',
    port: 3306
})

const query = util.promisify(db.query).bind(db)

module.exports = {
    db,
    query,
}