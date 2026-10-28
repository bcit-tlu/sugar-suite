(function ($) {
	var $dataTables = $("table.data-table");
	var scriptURL = "../js/vendor/dataTables-2.3.4.min.js";
	var cssURL = "../css/vendor/dataTables-2.3.4.min.css";
	
	if ($dataTables.length) {
		// Load DataTables from local file
		if (typeof $.fn.DataTable === 'undefined') {
			const script = document.createElement('script');
			script.src = scriptURL;
			script.onload = function() {
				init();
			};
			script.onerror = function() {
				console.error('Failed to load DataTables from local file');
			};
			document.head.appendChild(script);
		} else {
			init();
		}
	}

	function init() {
		var $stylesheet = $("<link>");
		$stylesheet.attr("rel", "stylesheet");
		$stylesheet.attr("href", cssURL);
		$("head").append($stylesheet);
		$dataTables.addClass("unstyled");
		$dataTables.each(function () {
			var $table = $(this);
			var options = {
				lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
				paging: false,
				ordering: true,
				info: false				
			};
			
			if($table.hasClass("paging")) {
				options.paging = true;
			}
			if($table.hasClass("static")) {
				options.ordering = false;
			}
			if($table.hasClass("info")) {
				options.info = true;
			}
			
			$(this).DataTable(options);
		});
	}
}(jQuery));
