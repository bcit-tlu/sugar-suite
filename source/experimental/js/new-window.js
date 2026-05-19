(function($) {
	
	$("a.new-window").on("click", function (e) {
		e.preventDefault();
		var url = $(this).attr("href");
		window.open(url, "not important", "height=200, width=200, left=10000, top=100, menubar=0, titlebar=0, status=0, toolbar=0, scrollbars=0");

		window.moveTo(0, 0);
		console.log("Screen height, width: " + screen.height + ", " + screen.width);
		console.log("Screen available height, width: " + screen.availHeight + ", " + screen.availWidth);
		console.log("Window height, width: " + window.outerHeight + ", " + window.outerWidth);

	});

	/* All Options for Window.open: 

	channelmode=yes|no|1|0
	//Whether or not to display the window in theater mode. Default is no. IE only

	directories=yes|no|1|0
	//Obsolete. Whether or not to add directory buttons. Default is yes. IE only

	fullscreen=yes|no|1|0
	//Whether or not to display the browser in full-screen mode. Default is no. A windowin full-screen mode must also be in theater mode. IE only

	height=pixels
	//The height of the window. Min. value is 100

	left=pixels
	//The left position of the window. Negative values not allowed

	location=yes|no|1|0
	//Whether or not to display the address field. Opera only

	menubar=yes|no|1|0
	//Whether or not to display the menu bar

	resizable=yes|no|1|0
	//Whether or not the window is resizable. IE only

	scrollbars=yes|no|1|0
	//Whether or not to display scroll bars. IE, Firefox & Opera only

	status=yes|no|1|0
	//Whether or not to add a status bar

	titlebar=yes|no|1|0
	//Whether or not to display the title bar. Ignored unless the calling application is
	an HTML Application or a trusted dialog box
	toolbar=yes|no|1|0
	//Whether or not to display the browser toolbar. IE and Firefox only

	top=pixels
	//The top position of the window. Negative values not allowed

	width=pixels
	//The width of the window. Min. value is 100
	*/

}(jQuery));