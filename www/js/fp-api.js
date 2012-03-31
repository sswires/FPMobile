function FPInterface()
{
	this.apiURL = "http://api.facepun.ch/";
	this.authed = false;
	this.username = false;
	this.password = false;
	this.forums = new Array();
	
	var fp = this;
	
	// Add event listeners to non-unique clickable objects
	$(".thread").live('click', function() {
		fp.getThread(this.getAttribute("thread"), this.getAttribute("pages"));
	});
	
	$(".forum").live('click', function() {
		fp.getForum(this.getAttribute("forum"), this.getAttribute("category"));
	});
	
	$(".subforum").live('click', function() {
		fp.getSubforum(this.getAttribute("subforum"));
	});
	
	// Save ratings and filenames
	this.ratings = new Array();
	this.ratings["agree"] = "http://www.facepunch.com/fp/ratings/tick.png";
	this.ratings["disagree"] = "http://www.facepunch.com/fp/ratings/cross.png";
	this.ratings["funny"] = "http://www.facepunch.com/fp/ratings/funny2.png";
	this.ratings["winner"] = "http://www.facepunch.com/fp/ratings/winner.png";
	this.ratings["zing"] = "http://www.facepunch.com/fp/ratings/zing.png";
	this.ratings["informative"] = "http://www.facepunch.com/fp/ratings/information.png";
	this.ratings["optimistic"] = "http://www.facepunch.com/fp/ratings/heart.png";
	this.ratings["dumb"] = "http://www.facepunch.com/fp/ratings/box.png";
	this.ratings["late"] = "http://www.facepunch.com/fp/ratings/clock.png";
	this.ratings["artistic"] = "http://www.facepunch.com/fp/ratings/palette.png";
	this.ratings["programming_king"] = "http://www.facepunch.com/fp/ratings/programming_king.png";
	this.ratings["friendly"] = "http://www.facepunch.com/fp/ratings/heart.png";
	this.ratings["smarked"] = "http://www.facepunch.com/fp/ratings/weed.png";
	this.ratings["moustache"] = "http://www.facepunch.com/fp/ratings/moustache.png";
	this.ratings["lua_king"] = "http://www.facepunch.com/fp/ratings/lua_king.png";
	this.ratings["mapping_king"] = "http://www.facepunch.com/fp/ratings/mapping_king.png ";
	this.ratings["lua_helper"] = "http://www.facepunch.com/fp/ratings/lua_helper.png";
	this.ratings["useful"] = "http://www.facepunch.com/fp/ratings/wrench.png";
}

FPInterface.prototype.APIRequest = function(action, get, post, callback)
{
	if (typeof action != "undefined")
	{
		var url = this.apiURL + "?username=" + this.username + "&password=" + this.password + "&action=" + action;
		if (get != 0)
		{
			$.each(get, function(key, val) {
				url = url + "&" + key + "=" + val;
			});
		}
		
		var isPost = false;
		var postData = "";
		if(post != 0)
		{
			var numParam = 0;
			isPost = true;
			$.each(post, function(key, val) {
				if (numParam > 0)
				{	
					postData = postData + "&" + key + "=" + encodeURI(val);
				}
				else
				{
					postData = postData + key + "=" + encodeURI(val);
				}
				numParam += 1;
			});
		}
		
		if (isPost)
		{
			$.post(url, postData, function(data) {
				console.log("Sent request: " + url + " POST: " + postData);
				if (typeof data.error != "undefined") // If we received an error response
				{
					console.log("FP-API Response Error: " + data.error);
					alert("Something went wrong! Check JS logs for details!");
				}
				else
				{
					callback(data); // Return our callback with the relevant data. Data is FALSE if error for easy checking.
				}
			});
		}
		else
		{
			$.get(url, function(data) {
				console.log("Sent request: " + url);
				if (typeof data.error != "undefined") // If we received an error response
				{
					console.log("FP-API Response Error: " + data.error);
					alert("Something went wrong! Check JS logs for details!");
				}
				else
				{
					callback(data); // Return our callback with the relevant data. Data is FALSE if error for easy checking.
				}
			}, "json");
		}
	}
}

FPInterface.prototype.showLoading = function()
{
	console.log("Loading..");
	$("#loadingWrapper").width("100%");
	$("#loadingWrapper").height("100%");
	$("#loadingWrapper").html("<div id='loading'><img class='loadingImg' src='img/loading.gif'/></div>");
}

FPInterface.prototype.hideLoading = function()
{
	console.log("Done!");
	$("#loadingWrapper").width("0px");
	$("#loadingWrapper").height("0px");
	$("#loadingWrapper").html(""); // Empty the wrapper, no more effect, no more content
}

FPInterface.prototype.login = function(user, pass)
{
	this.username = user;
	this.password = hex_md5(pass);
	var fp = this;
	
	this.showLoading();
	this.APIRequest("authenticate", 0, 0, function(data) {
		if (data.login == "Login OK")
		{
			console.log("Successfully logged in client: " + user);
			fp.authed = true;
			fp.getFrontPage();
		}
		else
		{
			fp.hideLoading();
			$("#loginError").html("Invalid username/password combination!");
			console.log("Failed login attempt: Invalid user/pass combo!");
		}
	})
}

FPInterface.prototype.attemptLogin = function()
{
	var user = $("#usernameInput").val();
	var pass = $("#passwordInput").val();
	
	if (typeof user != "undefined" && typeof pass != "undefined")
	{
		this.login(user, pass);
	}
	else
	{
		console.log("Failed login attempt: Invalid input!");
	}
}

FPInterface.prototype.getLoginPage = function()
{
	this.showLoading();
	var content = "<div id='loginBox'><img src='img/logo.png' alt=''/>Username:<br/><input type='text' id='usernameInput' class='textinput'/><br/>Password:<br/><input type='password' id='passwordInput' class='textinput'/><br/><input type='submit' value='Login' id='loginButton' class='button' style='padding: 10px; margin-top: 5px;'/><span id='loginError'></span></div>";
	var fp = this;
	$("#main").html(content);
	$("#loginButton").click(function() {
		fp.attemptLogin();
	});
	this.hideLoading();
}

FPInterface.prototype.loadFrontPage = function()
{
	var fp = this;
	this.APIRequest("getforums", 0, 0, function(data) {
		$.each(data["categories"], function(key, val) {
			fp.forums[key] = val; // Save forum dump
		});
		
		fp.viewFrontPage();
	});
}

FPInterface.prototype.viewFrontPage = function()
{
	$("#main").html(""); // Clear the frame so we can start adding our new layout
	var fp = this;
	
	$.each(this.forums, function(key, val) {
		$("#main").append("<div class='categoryWrapper'><div class='category'>" + val.name + "</div><table class='forumList' id='cat" + key + "'></div>"); // Create a category entry
		var category = key; // Save current category so the next loop knows where to add forums
		var toggle = false; // Used as a toggle switch to make every other entry a different color
		var borderTop = true; // One-time switch used to make the top list element have no borders
		$.each(val["forums"], function(key, val) {
			if (toggle)
			{
				$("#cat" + category).append("<tr class='forum' forum='" + key + "' category='" + category + "' style='background-color: rgb(245, 245, 245);'><td class='forumImg'><img src='img/forum/" + val.id + ".png' alt=''/></td><td>" + val.name + "</td></tr>");
			}
			else
			{
				if (borderTop)
				{
					$("#cat" + category).append("<tr class='forum' forum='" + key + "' category='" + category + "' style='border: none;'><td class='forumImg'><img src='img/forum/" + val.id + ".png' alt=''/></td><td>" + val.name + "</td></tr>");
					borderTop = false;
				}
				else
				{
					$("#cat" + category).append("<tr class='forum' forum='" + key + "' category='" + category + "'><td class='forumImg'><img src='img/forum/" + val.id + ".png' alt=''/></td><td>" + val.name + "</td></tr>");
				}
			}
			
			toggle = !toggle; // Reverse the toggle
		});
	});
	
	console.log("Successfully loaded front page");
	this.hideLoading();
}

FPInterface.prototype.getFrontPage = function()
{
	this.loadFrontPage();
}

FPInterface.prototype.getForum = function(forum, category)
{
	this.showLoading();

	$("#main").html(""); // Clear frame so we can load new view
	var fp = this;
	var forumID = this.forums[category]["forums"][forum].id;
	
	if (typeof this.forums[category]["forums"][forum]["forums"] != "undefined")
	{
		$("#main").append("<div class='categoryWrapper'><div class='category'>Subforums</div><table class='forumList' id='subforums'></div>");
		
		// Loop through subforums and display them!
		var toggle = false; // Used as a toggle switch to make every other entry a different color
		var borderTop = true; // One-time switch used to make the top list element have no borders
		$.each(this.forums[category]["forums"][forum]["forums"], function(key, val) {
			if (toggle)
			{
				$("#subforums").append("<tr class='subforum' subforum='" + val.id + "' style='background-color: rgb(245, 245, 245);'><td>" + val.name + "</td></tr>");
			}
			else
			{
				if (borderTop)
				{
					$("#subforums").append("<tr class='subforum' subforum='" + val.id + "' style='border: none;'><td>" + val.name + "</td></tr>");
					borderTop = false;
				}
				else
				{
					$("#subforums").append("<tr class='subforum' subforum='" + val.id + "'><td>" + val.name + "</td></tr>");
				}
			}
			
			toggle = !toggle; // Reverse the toggle
		});
	}
	

	var madeThreadCat = false;
	
	// Handle the threads
	this.APIRequest("getthreads", {"forum_id" : forumID, "page" : 1}, 0, function(data) {
		console.log("Successfully loaded threads from forum: " + forumID);
		if (!madeThreadCat)
		{
			// Create a new category with the name of the forum
			$("#main").append("<div class='categoryWrapper'><div class='category'>" + data.title + "</div><table class='threadList' id='threads'></div>");
			
			var toggle = false; // Used as a toggle switch to make every other entry a different color
			var borderTop = true; // One-time switch used to make the top list element have no borders

			// Loop through threads and display them
			$.each(data["threads"], function(key, val) {
				var style = false;
				if (val.status == "sticky")
				{
					style = "background-color: #FFA; border-top: 2px solid rgb(225, 225, 140); font-weight: bold;";
				}
				else if (val.locked)
				{
					style = "background-color: rgb(230, 230, 230); color: rgb(120, 120, 120);";
				}
				else if (toggle)
				{
					style = "background-color: rgb(245, 245, 245);";
				}
				
				if (borderTop)
				{
					if (style != false)
					{
						style.replace("border-top: 2px solid rgb(225, 225, 140);", "");
					}
					
					style = style + "border-top: none";
					borderTop = false;
				}
				
				if (style != false)
				{
					if (typeof val.newposts != "undefined")
					{
						$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "' style='" + style + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "<br/><span class='newposts'>" + val.newposts + " new posts!</span></td></tr>");
					}
					else
					{
						$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "' style='" + style + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "</td></tr>");
					}
				}
				else
				{
					if (typeof val.newposts != "undefined")
					{
						$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "<br/><span class='newposts'>" + val.newposts + " new posts!</span></td></tr>");
					}
					else
					{
						$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "</td></tr>");
					}
				}
				
				toggle = !toggle; // Reverse the toggle
			});
		}
		
		fp.hideLoading();
	});
}

/*
*	I'm a lazy cunt so if Garry starts adding subforums to subforums
*	then I'm going to have a lot of work to do.
*/
FPInterface.prototype.getSubforum = function(forum)
{
	this.showLoading();
	var fp = this;
	
	$("#main").html(""); // Clear the frame for our new content

	// Handle the threads
	this.APIRequest("getthreads", {"forum_id" : forum, "page" : 1}, 0, function(data) {
		// Create a new category with the name of the forum
		$("#main").append("<div class='categoryWrapper'><div class='category'>" + data.title + "</div><table class='threadList' id='threads'></div>");
		
		var toggle = false; // Used as a toggle switch to make every other entry a different color
		var borderTop = true; // One-time switch used to make the top list element have no borders
		
		// Loop through threads and display them
		$.each(data["threads"], function(key, val) {
			var style = false;
			if (val.status == "sticky")
			{
				style = "background-color: #FFA; border-top: 2px solid rgb(225, 225, 140); font-weight: bold;";
			}
			else if (val.locked)
			{
				style = "background-color: rgb(230, 230, 230); color: rgb(120, 120, 120);";
			}
			else if (toggle)
			{
				style = "background-color: rgb(245, 245, 245);";
			}
			
			if (borderTop)
			{
				if (style != false)
				{
					style.replace("border-top: 2px solid rgb(225, 225, 140);", "");
				}
					
				style = style + "border-top: none";
				borderTop = false;
			}
			
			if (style != false)
			{
				if (typeof val.newposts != "undefined")
				{
					$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "' style='" + style + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "<br/><span class='newposts'>" + val.newposts + " new posts!</span></td></tr>");
				}
				else
				{
					$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "' style='" + style + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "</td></tr>");
				}
			}
			else
			{
				if (typeof val.newposts != "undefined")
				{
					$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "<br/><span class='newposts'>" + val.newposts + " new posts!</span></td></tr>");
				}
				else
				{
					$("#threads").append("<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "'><td class='threadImg'><img src='img/thread/" + val.icon.replace("fp/posticons/", "").replace("fp/vb/misc/", "").replace("/", "") + "' alt=''/></td><td class='threadInfo'>" + val.title + "</td></tr>");
				}
			}
			
			toggle = !toggle; // Reverse the toggle
		});
		
		fp.hideLoading();
	});
}

FPInterface.prototype.getThread = function(thread, page)
{
	var fp = this;
	this.showLoading();
	
	$("#main").html(""); // Clear the frame for our new content
	
	// Handle posts
	this.APIRequest("getposts", {"thread_id" : thread, "page" : page}, 0, function(data) {
		// Create a new category with the name of the forum
		$("#main").append("<div class='categoryWrapper'><div class='category'>" + data.title + "</div><table class='postList' id='posts'></div>");
		
		// Loop through posts and display them
		$.each(data["posts"], function(key, val) {
			if (typeof val.avatar != "undefined")
			{
				if (typeof val.ratings != "undefined")
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'><td><div class='userdata'><div class='avatar'><img src='http://facepunch.com/" + val.avatar + "' alt=''/></div><div id='usertext'><span class='username'>" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div></div><div class='postData'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div><div class='postRatings' id='ratings" + val.id + "'></div></td></tr>");
				}
				else
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'><td><div class='userdata'><div class='avatar'><img src='http://facepunch.com/" + val.avatar + "' alt=''/></div><div id='usertext'><span class='username'>" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div></div><div class='postData'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div></td></tr>");
				}
			}
			else
			{
				if (typeof val.ratings != "undefined")
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'><td><div class='userdata'><div id='usertext'><span class='username'>" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div></div><div class='postData'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div><div class='postRatings' id='ratings" + val.id + "'></div></td></tr>");
				}
				else
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'><td><div class='userdata'><div id='usertext'><span class='username'>" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div></div><div class='postData'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div></td></tr>");
				}
			}
			
			var postID = val.id;
			
			// Parse post ratings
			if (typeof val.ratings != "undefined")
			{
				$.each(val.ratings, function(key, val) {
					$("#ratings" + postID).append("<div class='rating'><img src='" + fp.ratings[key] + "' alt=''/> x " + val + "</div>");
				});
			}
		});
		
		// Add "Post Reply" field
		$("#main").append("<div class='categoryWrapper'><div class='category'>Post Reply</div><div id='replyForm'><textarea id='replyField'></textarea><input type='submit' value='Submit Reply' class='button' id='replyButton'/></div></div>");
		
		fp.hideLoading();
		
		$("#replyButton").live('click', function() {
			fp.submitPost($("#replyField").val(), thread);
			$("#replyButton").attr("value", "Posting...");
		});
	});
}

FPInterface.prototype.submitPost = function(content, thread)
{
	var fp = this;

	//fp.showLoading();
	if (typeof content != "undefined" && typeof thread != "undefined")
	{
		this.APIRequest("newreply", 0, {"thread_id" : thread, "message" : content}, function(data) {
			if (data.reply == "OK")
			{
				console.log("Post successful in thread: " + thread);
				fp.getThread(thread);
			}
		});
	}
	else
	{
		console.log("Failed to make post: Content/ThreadID invalid!");
	}
}


























