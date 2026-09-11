const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config=require('../config');

const dbDir=path.dirname(config.db.sqlitePath);
if(!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir, { recursive:true});
}
const db=new Database(config.db.sqlitePath);
db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');
function applySchema(){
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql=fs.readFileSync(schemaPath,'utf8');
    db.exec(schemaSql);//all statements use CREATE TABLE/INDEX IF NOT EXISTS — safe to re-run
}

applySchema();
module.exports=db;



