// External Dependencies 
 var express = require('express');
 var exphb = require('express-handlebars');
 var mongoose = require('mongoose');
 var bodyParser = require('body-parser');
 var cheerio = require('cheerio');
 var request = require('request');
// Initialize Express
var app = express();
var PORT = process.env.PORT || 3070;


// Internal Dependencies 
var Article = require("./models/article.js");
var Comment = require("./models/comment.js");

// Static file support with public folder
app.use(express.static("public"));

// Configure the app to use body parser
app.use(bodyParser.urlencoded({ extended: false }));

/* MONGOOSE FUN STARTS HERE */

// Here's how we hook mongoose with the mongodb database
// Our database: GetTheNews
mongoose.connect("mongodb://localhost:27017/getTheNews");

// Save our mongoose connection to db
var db = mongoose.connection;

// If there's a mongoose error, log it to console
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once we "open" a connection to mongoose, tell the console we're in
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// //======Routes=======

//Home route
app.get('/', function(request, response) {
  res.send(index.html);
});

//Scrape route
app.get("/scrape", function(req, res) {
	console.info("getting scrapes");
	var url = "https://news.google.com/";
	request(url, function (error, response, body) {
		if (error) {
			var err = new Error('Error requesting from google news', error)
			console.error(err);
		}
		console.info('Success requesting from google news')
		//Load the scraped site's body into cheerio
		var $ = cheerio.load(body);
	
		//loop through each scraped article
		$(".esc-lead-article-title").children().each(function (i, element) {
			var title = $(element).text().trim();
			var link = $(element).attr("href");

			var result = {
			    title: title,
			    link: link
			};

			Article.find({link: result.link}, function(error, articleArr) {
				//If the current article is already in the database
				if(articleArr.length){
					console.log("Article skipped: ", articleArr)
				}//Otherwise, store it to the DB
				else {
		  			var scrapedArticle = new Article(result);
		  			scrapedArticle.save(function(error, doc) {
		  				if (error) {
		  				console.log("error: ", error);
		  				} else{
		  				console.log("new article scraped:", doc);
		  				}
 					})
		  		};
		  	});	
		});
	});
});

//Retrieve all articles from the DB
app.get("/articles", function(request, response){
	console.info('getting articles')
	Article.find({}, function(error, doc){
		if (error) {
			var err = new Error('Error finding articles', error)
			console.error(err);
		} else {
			console.info('found articles', doc.length)
			response.json(doc);
		}
	});
});

//Retrieve a specific article by id
app.get("/articles/:id", function(request, response){
	//Find the specific article in the DB
	Article.findOne({"_id": request.params.id})
	//Populate thehat article's comments
	.populate("comment")
	//Run the query
	.exec(function(error, doc){
		if(error){
			console.log(error);
		}else{
			response.json(doc);
		}
	});
});

//Add and replace notes
app.post("/articles/:id", function(request, response){
	//Make a new Note from the user's input
	var newNote = new Note(request.body);

	newNote.save(function(error, doc){
		if (error){
			console.log(error);
		} else{
			//Add new note/replace old note with new note
			Article.findOneAndUpdate({"_id": request.params.id}, {"note": doc._id})
			.exec(function(error, doc){
				if(error){
					console.log(error);
				} else{
					response.send(doc);
				}
			})
		}
	});
});




app.listen(3070, function() {
  console.log("App running on port 3070!");
});