(function ($) {
	// Select D2L's jQuery object
	var _$ = window.parent.jQuery;

	destickStickyNav();
	edgeToEdge();
	makeResponsive(0.5);
	stimulateResize();
	screenBottomAdjuster();

	// Prevent minibar from distracting users
	function destickStickyNav() {
		_$(".d2l-minibar").css("position", "relative");
	}

	// Remove padding to allow for edge-to-edge content
	function edgeToEdge() {
		_$(".d2l-page-main-padding").css({
			"padding-left": 0,
			"padding-right": 0
		});

		// Add padding back to the header
		_$(".d2l-page-header").css("padding", "0 20px");

		// Add padding back to elements after the content
		_$("#ContentView").nextUntil().css({
			"padding-left": "10px",
			"padding-right": "10px"
		});
	}

	// Remove min/max-widths from screen
	function makeResponsive(animationTime) {
		// Prevent navbar from extending full-screen
		_$(".d2l-navbar-link:contains(Course Home)").closest(".d2l-box-layout").css({
			"max-width": "960px",
			margin: "auto"
		});

		// Animate to current window size
		_$(".d2l-min-width, .d2l-max-width").css({
			transition: "all " + animationTime + "s ease",
			"min-width": "0px",
			"max-width": window.parent.innerWidth + 100 + "px"
		});

		// Remove transition properties shortly after animation
		setTimeout(function () {
			_$(".d2l-min-width, .d2l-max-width").css({
				transition: "none",
				"min-width": "inherit",
				"max-width": "inherit"
			});
		}, animationTime * 1000 + 500);
	}

	// Resizing the window doesn't seem to trigger D2L's iframe resize function.  This leaves the page either partially obscured or way above the bottom navigation area.  This function sets up a listener to adjust the screen for D2L.
	function stimulateResize() {
		var debounce;
		var debounceTime = 200;

		_$(window).on("resize", function () {
			clearTimeout(debounce);
			debounce = setTimeout(adjustIframe, debounceTime);
		});

		function adjustIframe() {
			var height;
			// make smaller than document
			_$(".d2l-iframe").css("height", "0px");

			// measure document
			height = $(document).height();

			// set height of iframe
			_$(".d2l-iframe").css("height", height + "px");

			// adjust min-height of whatever this is
			_$(".d2l-fileviewer-text").css("min-height", height + "px");
		}
	}

	// After resizing, D2L's collapsing side naviagation can hold the bottom of the scrollbar below the actual bottom of the page.  This fixes that by returning the scroll position to the natural bottom of the page. 
	function screenBottomAdjuster() {
		var debounce;
		var debounceTime = 200;

		_$(window).on("resize", function () {
			clearTimeout(debounce);
			debounce = setTimeout(bottomOut, debounceTime);
		});

		function bottomOut() {
			var animationTime = 200;
			var scrollTop = _$("body").scrollTop();
			var windowHeight = window.parent.innerHeight;

			// Check if d2l-page-main element exists
			var pageMain = _$(".d2l-page-main");
			if (pageMain.length === 0) {
				return; // Exit early if element doesn't exist
			}

			var pageTop = pageMain.offset().top;
			var pageHeight = pageMain.height();
			var pageBottom = pageTop + pageHeight - windowHeight;

			if (scrollTop > pageBottom) {
				_$("html, body").animate({
					scrollTop: pageBottom - 2
				}, animationTime);
			}
		}
	}

}(jQuery));