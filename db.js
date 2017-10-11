const sqllite3 = require('sqlite3').verbose();
const config = require('./config/config');
function getdb(callback) {
        var db = new sqllite3.Database(config.dbname);

        db.serialize(function() {
            db.run("CREATE TABLE if not exists skills (name TEXT PRIMARY KEY, description TEXT)");
            db.run("CREATE TABLE if not exists reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, score TEXT, comment TEXT, name TEXT, FOREIGN KEY(name) REFERENCES skills(name))");
            db.run("CREATE TABLE IF NOT EXISTS phrases (id INTEGER PRIMARY KEY AUTOINCREMENT, phrase TEXT, name TEXT, FOREIGN KEY(name) REFERENCES skills(name))")
            
        });
        try {
            callback(db);
        } catch(err) {
            console.log(err);
            console.log("Error caught");
        }

        db.close();
}


module.exports = {
    getdb: getdb,
    storeskill: function(skillname, description) {
        getdb((db) => {
                try{
                    db.run("INSERT INTO skills VALUES (?, ?)", skillname, description);
                } catch(err) {
                    console.log("Error occurred: " + err);
                }
            }
        );
    },
    storereview: function(skillname, score, comment) {
        getdb((db) => {
            db.get("SELECT * FROM skills WHERE name=?", skillname, (_db, row) => {
                if(row)
                    db.run("INSERT INTO reviews(score, comment, name) VALUES (?, ?, ?)", score, comment, skillname);
            });
        });
    },
    storephrase: function(skillname, phrase) {
         getdb((db) => {
            db.get("SELECT * FROM skills WHERE name=?", skillname, (_db, row) => {
                if(row)
                    db.run("INSERT INTO phrases(phrase, name) VALUES (?, ?)", phrase, skillname);
            });
        });
       
    },
    haveseenskill: function(skillname, callback) {
        getdb((db) => {
            db.get("SELECT * FROM skills WHERE name=?", skillname, (_db, row) => {
                if(row)
                    callback(true);
                else
                    callback(false);
            });

        });
    }
}