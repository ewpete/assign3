// Initialization
var express = require('express');
var bodyParser = require('body-parser');
var validator = require('validator'); // See documentation at https://github.com/chriso/validator.js
var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true }));

// Mongo initialization and connect to database
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/assign3';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
	db = databaseConnection;
});

var json_response;

app.post('/sendLocation', function(request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    response.set('Content-Type', 'text/html');
	if ((request.body.login == undefined) ||
         (request.body.lat == undefined) ||
         (request.body.lng == undefined) ||
         (isNaN(request.body.lat)) ||
         (isNaN(request.body.lng))) {
        response.status(400).send(JSON.stringify({"error":"Whoops, something is wrong with your data!"}));
    } else {    
    	uLogin = request.body.login;
		lat = request.body.lat;
		lng = request.body.lng;
		
		d = new Date();
		var toInsert = {
			"login": uLogin,
			"lat": parseFloat(lat),
			"lng": parseFloat(lng),
			"created_at": d
		};
        //insert the info (delete previous entry if it exists)
        db.collection('locations4', function(er1, collection) {
            if (!er1) {
                collection.update({login:uLogin}, toInsert, {upsert: true}, function(er, result) {
                    if (!er) {
                        collection.find().sort({created_at: -1}).toArray(function(err, cursor) {
                            if (!err) {
                                response.status(200).send(JSON.stringify(cursor));
                            } else {
                                response.status(500).send();
                            }
                        });
                    } else {
                        response.status(500).send();
                    }
                });
            } else {
                response.status(500).send();
            }
        });    
	}
});

app.get('/location.json', function(request, response) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    response.set('Content-Type', 'text/html');
    if (request.query.hasOwnProperty("login")) {
        db.collection('locations4', function(err, collection) {
            if (!err) {
                collection.find( {login: request.query.login}).toArray(function(err, cursor) {
                    if (!err) {
                        if (cursor.length != 0) {
                            response.send(JSON.stringify(cursor[0]));
                        } else {
                            response.send("{}");
                        }
                    } else {
                        //error with database
                        response.status(500).send();
                    }
                });
            } else {
                response.status(500).send();
            }
        });
    } else {
        response.status(400).send("{}");
    }
});


app.get('/', function(request, response) {
	response.set('Content-Type', 'text/html');
	var indexPage = '';
	db.collection('locations4', function(er, collection) {
        if (!er) {
    		collection.find().sort({created_at: -1}).toArray(function(err, cursor) {
    			if (!err) {
    				indexPage += "<!DOCTYPE HTML><html><head><title> Tufts Marauder's Map logins</title></head><body><h1>Check Ins</h1>";
    				if (cursor.length != 0) { 
                        for (var count = 0; count < cursor.length; count++) {
        					indexPage += "<p>" + cursor[count].login + " checked in at [" 
                                       + cursor[count].lat +  ", " + cursor[count].lng + "] on " 
                                       + cursor[count].created_at + "</p>";
        				}
        				indexPage += "</body></html>";
                    } else {
                        indexPage +="<p> There have been no check-ins </p>"
                    }
        				
                    response.send(indexPage);
    			} else {
                    response.send("<!DOCTYPE HTML><html><head><title> Tufts Marauder's Map logins</title></head><body><h1>Database Error</h1>");
    			}
    		});
        } else {
            response.status(500).send();
        }
	});
});


// Oh joy! http://stackoverflow.com/questions/15693192/heroku-node-js-error-web-process-failed-to-bind-to-port-within-60-seconds-of
app.listen(process.env.PORT || 3000);