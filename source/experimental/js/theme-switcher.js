(function () {
	var options = [
		"bcit.css",
		"business.css",
		"energy.css",
		"health.css",
		"custom/business/business-administration.css",
		"custom/business/retail-marketing-management.css",
		"custom/health/bachelor-science-nursing.css",
		"custom/health/specialty-nursing-perinatal.css",
		"custom/computing/computing.css",
		"custom/construction/construction.css",
		"custom/transportation/transportation.css"
	];
	
	var $stylesheet = $("head link[href*='/css/']").not("[href*='experimental.css']");
	var primaryStylesheet = parseStylesheetPath($stylesheet.attr("href"));
	var prefs;
	var storageKey = "bcit-learner-prefs";
	
	if (typeof (Storage) !== "undefined") {
		prefs = JSON.parse(localStorage.getItem(storageKey)) || {};
	}

	var $select = $("<select id='theme-switcher' class='form-control' style='display: block; margin: 20px auto;'>");
	
	if(options.indexOf(primaryStylesheet) === -1) {
		options.unshift(primaryStylesheet);
	}
	
	if(options.indexOf(prefs.stylesheet) === -1) {
		options.unshift(prefs.stylesheet);
	}

	for (var option in options) {
		var text = options[option];
		var $option = $("<option>");
		$option.text(parseStylesheetName(text)).val(text);
		$select.append($option);
	}

	$(".container").prepend($select);

	$select.on("change", function () {
		var stylesheet = $(this).val();
		setStylesheet(stylesheet);
		updatePrefs("stylesheet", stylesheet);
	});
	

	
	if(prefs.stylesheet) {
		$select.val(prefs.stylesheet);
		setStylesheet(prefs.stylesheet);
	}

	function parseStylesheetPath(href) {
		return href.substring(href.indexOf("/css/") + 5);
	}
	
	function parseStylesheetName(href) {
		var name = "/" + href;
		name = name.split(".css")[0];
		name = name.substring(name.lastIndexOf("/") + 1);
		return name;
	}
	
	function setStylesheet(stylesheet) {
		console.log("changing stylesheet to",stylesheet);
		var href = $stylesheet.attr("href");
		href = href.substring(0, href.indexOf("/css/") + 5);
		href += stylesheet;
		$stylesheet.attr("href", href);
	}
		
	function updatePrefs(key, value) {
		prefs[key] = value;
		localStorage.removeItem(storageKey);
		localStorage.setItem(storageKey, JSON.stringify(prefs));
	}


}());