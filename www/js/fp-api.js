function FPInterface()
{
	this.apiURL = "http://api.facepun.ch/";
	this.apiKey = false;
	this.authed = false;
	this.username = false;
	this.password = false;
	this.userid = false;
	this.pagestack = new Array();
	this.forums = new Array();
	this.shouldAutologin = true;
	this.postRatingKeys = Array();
	
	this.SUPPORT_PUSH = false; // Does target device support Airship Push notifications?
	this.SUPPORT_BACKBUTTON = true; // Does the device have a hardware back-button?
	
	var fp = this;
	
	// Add event listeners to non-unique clickable objects
	$(".thread").live('click', function() {
		var page = 1;
		if (this.getAttribute("status") == "old" || this.getAttribute("hasNewPosts") == "true")
		{
			page = this.getAttribute("pages");
		}
		
		fp.getThread(this.getAttribute("thread"), page );
	});
	
	$(".forum").live('click', function() {
		fp.getForum(fp.getForumByID(this.getAttribute("forum")), 1);
	});
	
	$(".forumpage").live('change', function() {
		fp.pagestack.pop();
		fp.getForum(fp.getForumByID(this.getAttribute("forum")), $(this).val());
	});

	$(".threadpage").live('change', function() {
		fp.getThread(this.getAttribute("thread"), $(this).val());
	});

	$("#replyButton").live('click', function() {
		fp.submitPost($("#replyField").val(), this.getAttribute("thread"), this.getAttribute("page"));
		$("#replyButton").attr("value", "Posting...");
	});
	
	$(".ratePostButton").live('click', function() {
		fp.openRatingsDialogue(this.getAttribute("post"));
	});
	
	$(".ratingsListEntry").live('click', function() {
		fp.showLoading();
		fp.submitRating(this.getAttribute("rating"), this.getAttribute("post"), this.getAttribute("key"));
	});
	
	$(".quotePostButton").live('click', function() {
		fp.quotePost(this.getAttribute("post"), this.getAttribute("username"));
	});
	
	$(".editPostButton").live('click', function() {
		fp.editPost(this.getAttribute("post"));
	});
	
	// Back button listeners
	if (this.SUPPORT_BACKBUTTON)
	{
		document.addEventListener("backbutton", function() {
			if (fp.tempPageContent != false)
			{
				$("#main").html(fp.tempPageContent);
				fp.tempPageContent = false;
			}
			else if (fp.parentForum != "top")
			{
				fp.parentForum = fp.getForumByID(fp.parentForum);
				var newpage = fp.pagestack.pop();
				fp.getForum(fp.parentForum, newpage);
			}
			else
			{
				fp.pagestack.pop();
				fp.viewFrontPage();
			}
		}, false);
	}
	
	$(".backbutton").live('click', function() {
		if (fp.tempPageContent != false)
		{
			$("#main").html(fp.tempPageContent);
			fp.tempPageContent = false;
		}
		else if (fp.parentForum != "top")
		{
			fp.parentForum = fp.getForumByID(fp.parentForum);
			var newpage = fp.pagestack.pop();
			fp.getForum(fp.parentForum, newpage);
		}
		else
		{
			fp.pagestack.pop();
			fp.viewFrontPage();
		}
	});
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
					data = false;
				}
				
				callback(data); // Return our callback with the relevant data. Data is FALSE if error for easy checking.
			});
		}
		else
		{
			$.get(url, function(data) {
				console.log("Sent request: " + url);
				if (typeof data.error != "undefined") // If we received an error response
				{
					console.log("FP-API Response Error: " + data.error);
					data = false;
				}
				
				callback(data); // Return our callback with the relevant data. Data is FALSE if error for easy checking.
			}, "json");
		}
	}
}

FPInterface.prototype.showLoading = function(reason)
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

// the login() method actually authenticates with the server,
// the attemptLogin() method just fetches the front page and assumes
// your login data is correct. if your login info fails, we just call login()
// to authenticate and figure out what is wrong
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
			fp.userid = data.userid;
			
			// Save user/pass to device's local storage
			localStorage.username = user;
			localStorage.password = pass;
			
			// Init Push Notifications if supported
			if (this.SUPPORT_PUSH)
			{
				AirshipPush.init();
			}
			
			fp.getFrontPage();
		}
		else
		{
			delete localStorage.username;
            delete localStorage.password;
			
			fp.hideLoading();
			$("#loginError").html("Invalid username/password combination!");
			console.log("Failed login attempt: Invalid user/pass combo!");
		}
	});
}

// the login() method actually authenticates with the server,
// the attemptLogin() method just fetches the front page and assumes
// your login data is correct. if your login info fails, we just call login()
// to authenticate and figure out what is wrong
FPInterface.prototype.attemptLogin = function()
{
	var user = $("#usernameInput").val();
	var pass = $("#passwordInput").val();
	
	if (typeof user != "undefined" && typeof pass != "undefined")
	{
		this.username = user;
		this.password = hex_md5(pass);
		
		this.showLoading();
		this.getFrontPage();
	}
	else
	{
		console.log("Failed login attempt: Invalid input!");
	}
}

FPInterface.prototype.getLoginPage = function()
{
	this.showLoading();
	
	var username_html = '';
	var password_html = '';
	var autologin = false;
	
	if (this.shouldAutologin == true && typeof Storage !== "undefined")
	{
		if (localStorage.username && localStorage.password)
		{
			username_html = ' value="' + localStorage.username + '"';
			password_html = ' value="' + localStorage.password + '"';
			autologin = true;
		}
	}
	
	var content = "<div id='loginWrapper'><div id='loginBox'><img src='img/logo.png' alt=''/>Username:<br/><input type='text' id='usernameInput' class='textinput'" + username_html + "/><br/>Password:<br/><input type='password' id='passwordInput' class='textinput'" + password_html + "/><br/><input type='submit' value='Login' id='loginButton' class='button' style='padding: 10px; margin-top: 5px;'/><span id='loginError'></span></div></div>";
	var fp = this;
	
	$("#main").html(content);
	
	$("#loginButton").click(function() {
		if (fp.shouldAutologin == true)
		{
			fp.login($("#usernameInput").val(), $("#passwordInput").val());
		}
		else
		{
			fp.attemptLogin();
		}
	});
	
	if (autologin)
	{
	   fp.attemptLogin();
	}
	else
	{
	   this.hideLoading();
	}
}

FPInterface.prototype.loadFrontPage = function()
{
	var fp = this;
	this.APIRequest("getforums", 0, 0, function(data) {
		if (data != false)
		{
			$.each(data["categories"], function(key, val) {
				fp.forums[key] = val; // Save forum dump
			});
			
			fp.viewFrontPage();
		}
		else
		{
			fp.login(fp.username, fp.password);
		}
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
				$("#cat" + category).append("<tr class='forum' forum='" + val.id + "' category='" + category + "' style='background-color: rgb(250, 250, 250);'><td class='forumImg'><img src='img/forum/" + val.id + ".png' alt=''/></td><td class='forumName'>" + val.name + "</td></tr>");
			}
			else
			{
				if (borderTop)
				{
					$("#cat" + category).append("<tr class='forum' forum='" + val.id + "' category='" + category + "' style='border: none;'><td class='forumImg'><img src='img/forum/" + val.id + ".png' alt=''/></td><td class='forumName'>" + val.name + "</td></tr>");
					borderTop = false;
				}
				else
				{
					$("#cat" + category).append("<tr class='forum' forum='" + val.id + "' category='" + category + "'><td class='forumImg'><img src='img/forum/" + val.id + ".png' alt=''/></td><td class='forumName'>" + val.name + "</td></tr>");
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

FPInterface.prototype.getForumByID = function(forumid)
{
    var result = false;
	
	$.each(this.forums, function(key, val) {
		$.each(val.forums, function(key2, val2) {
			if (val2.id == forumid)
			{
				result = val2;
				result.parent = false;
				return true;
			}
			if (typeof val2.forums != "undefined")
			{
				$.each(val2.forums, function(key3, val3){
					if(val3.id == forumid)
					{
						result = val3;
						result.parent = val2.id;
						return true;
					}
				});
			}
		});
	});

	return result;
}

FPInterface.prototype.getForum = function(forum, page)
{
	this.showLoading();
	$("#main").html(""); // Clear frame so we can load new view
	
	var fp = this;
	var forumID = forum.id;
	
	fp.pagestack.push(page);
	
	if (forum.parent)
	{
		parent = forum.parent;
	}
	else
	{
		parent = "top";
	}

	var madeThreadCat = false;
	
	// Handle the threads
	this.APIRequest("getthreads", {"forum_id" : forumID, "page" : page}, 0, function(data) {
		console.log("Successfully loaded threads from forum: " + forumID);
		
		if (typeof forum["forums"] != "undefined")
		{
			fp.parentForum = parent;
			$("#main").append("<div class='categoryWrapper'><div class='backbutton' parentforum='" + parent + "'>Subforums</div><table class='forumList' id='subforums'></div>");
			
			// Loop through subforums and display them!
			var toggle = false; // Used as a toggle switch to make every other entry a different color
			var borderTop = true; // One-time switch used to make the top list element have no borders
			$.each(forum["forums"], function(key, val) {
				if (toggle)
				{
					$("#subforums").append("<tr class='forum' forum='" + val.id + "' style='background-color: rgb(250, 250, 250);'><td class='subforumName'>" + val.name + "</td></tr>");
				}
				else
				{
					if (borderTop)
					{
						$("#subforums").append("<tr class='forum' forum='" + val.id + "' style='border: none;'><td class='subforumName'>" + val.name + "</td></tr>");
						borderTop = false;
					}
					else
					{
						$("#subforums").append("<tr class='forum' forum='" + val.id + "'><td class='subforumName'>" + val.name + "</td></tr>");
					}
				}
				
				toggle = !toggle; // Reverse the toggle
			});
		}
		
		fp.parentForum = parent;
		if (!madeThreadCat)
		{
			// Create a new category with the name of the forum
			$("#main").append("<div class='categoryWrapper topBar'><div class='backbutton' parentforum='" + parent + "'>" + data.title + "</div><table class='threadList' id='threads'></div>");
			
			var toggle = false; // Used as a toggle switch to make every other entry a different color
			var borderTop = true; // One-time switch used to make the top list element have no borders

			// Loop through threads and display them
			$.each(data["threads"], function(key, val) {
				var style = false;
				if (val.status == "sticky")
				{
					style = "background-color: #FFA; border-top: 2px solid rgb(225, 225, 140); font-weight: bold; color: rgb(140, 140, 140);";
				}
				else if (val.locked)
				{
					style = "background-color: rgb(230, 230, 230); color: rgb(120, 120, 120);";
				}
				else if (toggle)
				{
					style = "background-color: rgb(250, 250, 250);";
				}
				
				if (borderTop)
				{
					if (style != false)
					{
						style.replace("border-top: 2px solid rgb(225, 225, 140);", "");
					}
					else
					{
						style = "";
					}
					
					style = style + "border-top: none";
					borderTop = false;
				}
				
				
				var status = "status='" + val.status + "'";
				var hasNewPosts = " ";
				var newposts = "";
				var styleAppend = (style != false) ? "style='" + style + "'>" : "";
					
				if (typeof val.newposts != "undefined")
				{
					hasNewPosts = " hasNewPosts='true' ";
					newposts = "- <span class='newposts'>" + val.newposts + " new post" + ( val.newposts != "1" ? "s" : "" ) + "!</span>";
				}
				
				$("#threads").append( "<tr class='thread' thread='" + val.id + "' pages='" + val.pages + "' " + status + hasNewPosts + styleAppend + "><td class='threadInfo'><div class='threadTitle'>" + val.title + "</div><div class='threadMeta'>" + val.author + " " + newposts + "</span></td></tr>");
				
				toggle = !toggle; // Reverse the toggle
			});
		}
		
		$("#main").append("<div class='categoryWrapper'><div class='category'><select forum='" + forumID + "' class='forumpage'></select></div></div>");
		
		for (i = 1; i <= data.numpages; i++)
		{
			if (i == page)
			{
				$(".forumpage").append("<option selected='selected'>" + i + "</option>");
			}
			else
			{
				$(".forumpage").append("<option>" + i + "</option>");
			}
		}
		
		fp.hideLoading();
	});
}

FPInterface.prototype.getThread = function(thread, page)
{
	var fp = this;
	var rawPage = page;
	var locked = false;
	
	this.showLoading();
	
	$("#main").html(""); // Clear the frame for our new content
	
	// Handle posts
	this.APIRequest("getposts", {"thread_id" : thread, "page" : page}, 0, function(data) {
		page = data.currpage;
		if (data.locked)
		{
			locked = true;
		}
		
		fp.parentForum = data.forumid;
		
		// Create a new category with the name of the forum
		$("#main").append("<div class='categoryWrapper'><div class='backbutton' parentforum='" + data.forumid + "'>" + data.title + "</div><table class='postList' id='posts'></div>");
		
		// Loop through posts and display them
		$.each(data["posts"], function(key, val) {
			fp.postRatingKeys[val.id] = val.ratingkeys;
			
			var postBG = "";
			var nameStyle = "";
			
			if (val.username.toLowerCase() == fp.username.toLowerCase()) // If it's our post
			{
				postBG = " style='background-image: url(\"img/post_yours.png\"); background-repeat: repeat-x;'";
			}
			else if (val.status == "new")
			{
				postBG = " style='background-image: url(\"img/post_new.png\"); background-repeat: repeat-x;'";
			}
			else if (val.status == "old")
			{
				postBG = " style='background-image: url(\"img/post_old.png\"); background-repeat: repeat-x;'";
			}
			
			if (val.useronline)
			{
				nameStyle = " style='border-bottom: 2px dotted #0D0;'";
			}
			
			if (typeof val.avatar != "undefined")
			{
				if (typeof val.ratings != "undefined")
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'" + postBG + "><td><div class='userdata'><div class='avatar'><img src='http://facepunch.com/" + val.avatar + "' alt=''/></div><div class='usertext'><span class='username'" + nameStyle + ">" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div><div class='postcontrols' id='controls" + val.id + "'></div></div><div class='postData' id='postData" + val.id + "'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div><div class='postRatings' id='ratings" + val.id + "'></div></td></tr>");
				}
				else
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'" + postBG + "><td><div class='userdata'><div class='avatar'><img src='http://facepunch.com/" + val.avatar + "' alt=''/></div><div class='usertext'><span class='username'" + nameStyle + ">" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div><div class='postcontrols' id='controls" + val.id + "'></div></div><div class='postData' id='postData" + val.id + "'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div></td></tr>");
				}
			}
			else
			{
				if (typeof val.ratings != "undefined")
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'" + postBG + "><td><div class='userdata'><div class='usertext'><span class='username'" + nameStyle + ">" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div><div class='postcontrols' id='controls" + val.id + "'></div></div><div class='postData' id='postData" + val.id + "'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div><div class='postRatings' id='ratings" + val.id + "'></div></td></tr>");
				}
				else
				{
					$("#posts").append("<tr class='post' id='post" + val.id + "'" + postBG + "><td><div class='userdata'><div class='usertext'><span class='username'" + nameStyle + ">" + val.username_html + "</span><br/><span class='userinfo'>" + val.postcount + " Posts</span><br/><span class='postdate'>" + val.time + "</span></div><div class='postcontrols' id='controls" + val.id + "'></div></div><div class='postData' id='postData" + val.id + "'>" + val.message.replace('<img src="/fp/emoot/', '<img src="http://facepunch.com/fp/emoot/') + "</div></td></tr>");
				}
			}
			
			if (val.username.toLowerCase() == fp.username.toLowerCase()) // If it's our post
			{
				$("#controls" + val.id).append("<input type='submit' value='Edit' class='editPostButton' post='" + val.id + "'/><br/><input type='submit' value='Quote' class='quotePostButton' post='" + val.id + "' username='" + val.username + "'/>");
			}
			else
			{
				$("#controls" + val.id).append("<input type='submit' value='Rate' class='ratePostButton' post='" + val.id + "'/><br/><input type='submit' value='Quote' class='quotePostButton' post='" + val.id + "' username='" + val.username + "'/>");
			}
			
			var postID = val.id;
			
			// Parse post ratings
			if (typeof val.ratings != "undefined")
			{
				$.each(val.ratings, function(key, val) {
					$("#ratings" + postID).append("<div class='rating'><img src='img/rating/" + key + ".png' alt=''/> x " + val + "</div>");
				});
			}
		});
		
		$("#main").append("<div class='categoryWrapper'><div class='category'><select thread='" + thread + "' class='threadpage'></select></div></div>");
		
		for (i = 1; i <= data.numpages; i++)
		{
			if (i == rawPage)
			{
				$(".threadpage").append("<option selected='selected'>" + i + "</option>");
			}
			else
			{
				$(".threadpage").append("<option>" + i + "</option>");
			}
		}
		
		if (!locked)
		{
			// Add "Post Reply" field
			$("#main").append("<div class='categoryWrapper'><div class='category'>Post Reply</div><div id='replyForm'><textarea id='replyField'></textarea><input type='submit' value='Submit Reply' class='button' id='replyButton' thread='" + thread + "' page='" + data.numpages + "'/></div></div>");
		}
		
		fp.hideLoading();
	});
}

FPInterface.prototype.submitPost = function(content, thread, page)
{
	var fp = this;

	//fp.showLoading();
	if (typeof content != "undefined" && typeof thread != "undefined")
	{
		this.APIRequest("newreply", 0, {"thread_id" : thread, "message" : content}, function(data) {
			if (data.reply == "OK")
			{
				console.log("Post successful in thread: " + thread);
				fp.getThread(thread, page);
			}
		});
	}
	else
	{
		console.log("Failed to make post: Content/ThreadID invalid!");
	}
}

FPInterface.prototype.openRatingsDialogue = function(post)
{
	var fp = this;
	fp.tempPageContent = $("#main").html();
	
	$("#main").html("<div class='categoryWrapper'><div class='backbutton'>Ratings</div></div><div id='ratingsScreen'><table id='ratingsTable'></table></div>");
	
	var ratingArray = Array();
	ratingArray["agree"] = "Agree";
	ratingArray["disagree"] = "Disagree";
	ratingArray["funny"] = "Funny";
	ratingArray["winner"] = "Winner";
	ratingArray["zing"] = "Zing";
	ratingArray["informative"] = "Informative";
	ratingArray["friendly"] = "Friendly";
	ratingArray["useful"] = "Useful";
	ratingArray["optimistic"] = "Optimistic";
	ratingArray["artistic"] = "Artistic";
	ratingArray["late"] = "Late";
	ratingArray["dumb"] = "Dumb";
	ratingArray["lua_helper"] = "Lua Helper";
	ratingArray["lua_king"] = "Lua King";
	ratingArray["moustache"] = "Moustache";
	ratingArray["programming_king"] = "Programming King";
	ratingArray["smarked"] = "Smarked";
	ratingArray["mapping_king"] = "Mapping King";
	
	var toggle = false;
	for (key in fp.postRatingKeys[post])
	{
		if (toggle)
		{
			$("#ratingsTable").append("<tr key='" + fp.postRatingKeys[post][key] + "' rating='" + key + "' post='" + post + "' class='ratingsListEntry'><td class='ratingsListImage'><img src='img/rating/" + key + ".png'></td><td class='ratingsListName'>" + ratingArray[key] + "</td></tr>");
		}
		else
		{
			$("#ratingsTable").append("<tr style='background-color: rgb(250, 250, 250);'key='" + fp.postRatingKeys[post][key] + "' rating='" + key + "' post='" + post + "' class='ratingsListEntry'><td class='ratingsListImage'><img src='img/rating/" + key + ".png'></td><td class='ratingsListName'>" + ratingArray[key] + "</td></tr>");
		}
		
		toggle = !toggle;
	}
}

FPInterface.prototype.submitRating = function(rating, post, key)
{
	var fp = this;
	$("#main").html("");
	
	this.APIRequest("rate", {"post_id" : post, "rating" : rating, "key" : key}, 0, function(data) {
		if (data.rating == "OK")
		{
			console.log("Rating successful on post: " + post);
		}
		else
		{
			console.log("Rating failed on post: " + post);
		}
		
		$("#main").html(fp.tempPageContent);
		fp.tempPageContent = false;
		fp.hideLoading();
	});
}

FPInterface.prototype.quotePost = function(post, username)
{
	var fp = this;
	
	// replaced with the getquote API action instead
	this.APIRequest("getquote", {"post_id": post}, 0, function(data) {

		if( data.quote )
		{
			$("#replyField").text( data.quote );
			window.location = "#replyField";
		}

	} );
}

FPInterface.prototype.editPost = function(post)
{
	var fp = this;
	var postContent = $("#postData" + post);
	var originalContents = postContent.html();
	
	this.APIRequest("getedit", {"post_id": post}, 0, function(data) {
		postContent.html( "<textarea data:post='" + post + "' class='editTextArea'>" + data.edit + "</textarea><input type='button' value='Edit Post' class='button postEdit'/><input type='button' value='Cancel' class='button cancelEdit' />" );
		
		// do the edit
		postContent.find( ".postEdit" ).click( function() {
			
			fp.APIRequest( "doedit", 0, {"post_id": post, "message": postContent.find(".editTextArea").text()}, function(data) {
				alert( data );
			} );
			
		} );
		
		// cancel edit
		postContent.find( ".cancelEdit" ).click( function() {
			postContent.html( originalContents );
		} );
	} );
}